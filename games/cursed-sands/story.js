/* ============================================
   Cursed Sands — Phase 2: NPCs, Quests, Lore & Story
   Ghost priest, merchant, quest system, codex, cutscenes, branching endings
   ============================================ */
var StorySystem = (function () {
    'use strict';

    // ============ STATE ============
    var gold = 0;
    var activeQuests = [];
    var completedQuests = [];
    var codexEntries = [];
    var merchantItems = [];
    var npcs = [];
    var cutsceneQueue = [];
    var isCutscenePlaying = false;
    var currentCutscene = null;
    var cutsceneTimer = 0;
    var playerChoices = { curseBroken: 0, darknessEmbraced: 0, pharaohPath: 0 };
    var interactTarget = null;

    // ============ LORE CODEX ============
    var HIEROGLYPHS = [
        { id: 'origin', title: 'The Pharaoh\'s Curse', text: 'In the age of Khufu, a dark ritual bound his soul to the sands. All who enter seeking treasure become servants of the curse. Only the seven Sacred Artifacts can break the binding.', location: 'Great Pyramid entrance' },
        { id: 'anubis', title: 'Guardians of Anubis', text: 'The Jackal God stationed his warriors at the Temple of the Dead. They judge every soul — and find all wanting. Their speed is unmatched, their staffs enchanted with death magic.', location: 'Temple back wall' },
        { id: 'nile', title: 'The River\'s Secret', text: 'Beneath the Nile lie forgotten caves, flooded temples of a civilization older than Egypt. Strange lights glow in the depths. Some say crocodile demons guard an ancient treasure.', location: 'Nile cave entrance' },
        { id: 'sphinx', title: 'Riddle of the Sphinx', text: 'The Sphinx guards not just knowledge, but a choice: break the curse and free the dead, claim the throne and rule the sands, or embrace the darkness and become eternal.', location: 'Near Sphinx' },
        { id: 'scarab', title: 'The Scarab Swarms', text: 'Born from cursed flesh, these insects devour sanity before they devour flesh. Light repels them — but only for a time. In complete darkness, they are death incarnate.', location: 'Underground catacombs' },
        { id: 'mummy', title: 'The Undead Legion', text: 'Once priests and soldiers, now wrapped in cursed linen. They remember fragments of their lives — enough to hate the living. Fire is their ancient fear.', location: 'Pyramid tomb room' },
        { id: 'artifacts', title: 'The Seven Sacred Relics', text: 'Eye of Horus sees truth. Golden Ankh grants life. Scarab Amulet wards evil. Canopic Jar holds souls. Pharaoh\'s Seal commands the dead. Djed Pillar channels power. Wadjet Crown crowns the worthy.', location: 'Obelisk inscriptions' },
        { id: 'oasis', title: 'The Hidden Oasis', text: 'East of the pyramids, palm trees mark a sacred spring. The water restores sanity to those who drink. But beware — the oasis draws predators in the night.', location: 'Oasis area' },
        { id: 'darkrite', title: 'Rite of Eternal Night', text: 'A forbidden ceremony spoken of in whispers. Three blood offerings at the temple altar under a new moon would grant immortality — at the cost of one\'s humanity. The Pharaoh attempted it.', location: 'Hidden tomb wall' },
        { id: 'freedom', title: 'The Liberation Prayer', text: 'Place all seven artifacts upon the altar. Speak the prayer of Osiris at dawn. The curse will shatter like clay. But the dead will not go quietly.', location: 'Temple altar hieroglyph' },
        { id: 'catacomb', title: 'The Under-Kingdom', text: 'A vast network of tunnels connects every pyramid, dug by ten thousand slaves. Their bones still walk these halls, wielding bronze swords against any who disturb their restless patrol.', location: 'Catacomb entrance' },
        { id: 'ammit', title: 'The Devourer Awaits', text: 'In the deepest chamber beneath the Great Pyramid, Ammit sleeps. Part crocodile, part lion, part hippopotamus — she devours the hearts of the unworthy. Do not wake her... yet.', location: 'Deepest tomb chamber' },
    ];

    // ============ QUESTS ============
    var QUEST_DEFS = [
        { id: 'q_priest1', title: 'Ghost of the High Priest', desc: 'Find and speak to the ghostly priest near the Great Pyramid. He has knowledge of the curse.', type: 'story', requires: null, reward: { gold: 20, codex: 'origin' }, location: { x: 35, z: -30 }, npcId: 'priest' },
        { id: 'q_tomb1', title: 'Tomb Explorer', desc: 'Enter the Great Pyramid\'s underground tomb and explore 3 rooms.', type: 'explore', requires: 'q_priest1', reward: { gold: 30, codex: 'catacomb' }, goal: 3, progress: 0 },
        { id: 'q_torch', title: 'Light the Way', desc: 'Light 5 wall torches in the underground tunnels.', type: 'torch', requires: null, reward: { gold: 15, sanity: 20 }, goal: 5, progress: 0 },
        { id: 'q_merchant', title: 'Khamun\'s Request', desc: 'The Nile merchant needs 3 treasures. Bring gold from the tombs.', type: 'gold', requires: null, reward: { gold: 0, item: 'sanity_potion' }, goal: 50, progress: 0 },
        { id: 'q_caves', title: 'Depths of the Nile', desc: 'Explore the underwater caves beneath the Nile river.', type: 'explore_cave', requires: null, reward: { gold: 40, codex: 'nile' }, goal: 3, progress: 0 },
        { id: 'q_hieroglyph1', title: 'Ancient Translator I', desc: 'Decode 3 hieroglyph inscriptions on walls around the world.', type: 'codex', requires: null, reward: { gold: 25, sanity: 15 }, goal: 3, progress: 0 },
        { id: 'q_hieroglyph2', title: 'Ancient Translator II', desc: 'Decode all 12 hieroglyph inscriptions.', type: 'codex', requires: 'q_hieroglyph1', reward: { gold: 50, item: 'torch_upgrade' }, goal: 12, progress: 0 },
        { id: 'q_survive', title: 'Survive the Night', desc: 'Survive one full night cycle (8pm to 5am) without losing more than 30 sanity.', type: 'survive_night', requires: null, reward: { gold: 35, codex: 'darkrite' }, startingSanity: 0, started: false, nightStart: false },
        { id: 'q_sphinx', title: 'Riddle of Ages', desc: 'Visit the Sphinx and contemplate its riddle.', type: 'visit', requires: 'q_priest1', reward: { gold: 20, codex: 'sphinx' }, location: { x: 20, z: 25 } },
        { id: 'q_cleanse1', title: 'Cleanse the Temple', desc: 'Collect the Eye of Horus and bring it to the temple altar.', type: 'deliver', requires: 'q_sphinx', reward: { gold: 30, sanity: 30 }, artifactNeeded: 'Eye of Horus' },
        { id: 'q_escort', title: 'Spirit Escort', desc: 'The ghost priest wants to visit the Sphinx. Stay within 15 units of him while he travels.', type: 'escort', requires: 'q_priest1', reward: { gold: 40, codex: 'freedom' }, escortActive: false, escortProgress: 0 },
        { id: 'q_final', title: 'The Final Choice', desc: 'Place all artifacts on the altar and make your choice.', type: 'ending', requires: null, reward: { gold: 0 } },
    ];

    // ============ MERCHANT ITEMS ============
    var SHOP_ITEMS = [
        { id: 'sanity_potion', name: 'Sanity Elixir', desc: 'Restores 40 sanity instantly.', price: 25, icon: '🧪', effect: 'sanity', value: 40, stock: 3 },
        { id: 'torch_upgrade', name: 'Eternal Flame Oil', desc: 'Battery drains 50% slower.', price: 40, icon: '🔥', effect: 'battery_upgrade', value: 0.5, stock: 1 },
        { id: 'amulet', name: 'Protective Amulet', desc: 'Reduces sanity drain by 30%.', price: 60, icon: '🔮', effect: 'sanity_resist', value: 0.3, stock: 1 },
        { id: 'bandage', name: 'Sacred Bandage', desc: 'Survive one lethal hit.', price: 35, icon: '🩹', effect: 'extra_life', value: 1, stock: 2 },
        { id: 'compass', name: 'Artifact Compass', desc: 'Shows nearest artifact direction.', price: 50, icon: '🧭', effect: 'artifact_compass', value: 1, stock: 1 },
        { id: 'incense', name: 'Warding Incense', desc: 'Repels scarabs for 60 seconds.', price: 20, icon: '🕯️', effect: 'scarab_ward', value: 60, stock: 3 },
    ];

    // ============ CUTSCENES ============
    var CUTSCENES = {
        intro: [
            'The year is 1923. You are Dr. Amara Khalil, an archaeologist drawn to the cursed desert of Saqqara.',
            'Your expedition vanished three days ago. You alone survived.',
            'The locals whisper of an ancient curse — the Pharaoh\'s rage, bound to seven sacred artifacts.',
            'Find them all. Break the curse. Or become another ghost in the sands...'
        ],
        priest_meet: [
            'A ghostly figure materializes before you, draped in priestly robes that shimmer like moonlight.',
            '"I am Imhotep, High Priest of the Old Kingdom. I have waited three thousand years for one worthy enough."',
            '"The Pharaoh\'s curse grows stronger with each passing moon. You must find the seven Sacred Artifacts."',
            '"But beware — the guardians will not surrender them willingly. Trust your torch, trust your mind."'
        ],
        ending_free: [
            'As dawn breaks, you place the final artifact upon the altar.',
            'A blinding light erupts from the stones. The curse shatters like ancient glass.',
            'The mummies collapse to dust. The Anubis guards kneel, then fade into mist.',
            'The spirits of ten thousand souls rise from the sands, finally free.',
            '"Thank you," whispers Imhotep, as he too ascends into the golden light.',
            'THE CURSE IS BROKEN. You are free.'
        ],
        ending_pharaoh: [
            'You raise the Pharaoh\'s Seal high above the altar.',
            'Dark energy surges through your body. The curse doesn\'t break — it bends to your will.',
            'The mummies bow. The Anubis guards kneel before their new master.',
            '"So it is done," Imhotep whispers. "A new Pharaoh rises."',
            'You will rule these sands for eternity. Power is yours.',
            'THE NEW PHARAOH RISES.'
        ],
        ending_dark: [
            'You speak the Rite of Eternal Night. The artifacts crack and shatter.',
            'Darkness erupts from the altar, consuming the temple, the pyramids, the desert.',
            'Your skin hardens to stone. Your eyes glow with ancient fire.',
            '"You fool," Imhotep cries, but his voice fades as the darkness takes him too.',
            'The curse doesn\'t end. It spreads. And you are its vessel.',
            'ETERNAL DARKNESS CONSUMES ALL.'
        ],
        merchant_intro: [
            '"Ah, a living soul! How rare, how precious in these cursed sands."',
            '"I am Khamun, the last honest trader on the Nile. I deal in relics, potions, and survival."',
            '"Bring me gold from the tombs, and I shall give you what you need to endure."'
        ],
    };

    // ============ BUILD NPCs ============
    function build(scene) {
        merchantItems = JSON.parse(JSON.stringify(SHOP_ITEMS));
        activeQuests = []; completedQuests = [];
        codexEntries = []; npcs = []; cutsceneQueue = [];
        isCutscenePlaying = false; currentCutscene = null;
        playerChoices = { curseBroken: 0, darknessEmbraced: 0, pharaohPath: 0 };
        gold = 0; interactTarget = null;

        // Spawn ghost priest near Great Pyramid
        spawnPriest(scene, 35, -30);
        // Spawn merchant at Nile dock
        spawnMerchant(scene, -32, 12);
        // Spawn hieroglyph walls
        spawnHieroglyphs(scene);
    }

    function spawnPriest(scene, x, z) {
        var group = new THREE.Group();
        // Ghostly body
        var bodyMat = new THREE.MeshStandardMaterial({
            color: 0x8888cc, transparent: true, opacity: 0.5,
            emissive: 0x4444aa, emissiveIntensity: 0.4
        });
        group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 2, 8), bodyMat));
        // Head
        var head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), bodyMat);
        head.position.y = 1.3; group.add(head);
        // Headdress
        var hdMat = new THREE.MeshStandardMaterial({ color: 0xffd700, transparent: true, opacity: 0.6, emissive: 0xaa8800, emissiveIntensity: 0.3 });
        var hd = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.4), hdMat);
        hd.position.y = 1.55; group.add(hd);
        // Staff
        var staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2), hdMat);
        staff.position.set(0.4, 0.5, 0); group.add(staff);
        // Ankh on staff
        var ankh = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 6, 8), hdMat);
        ankh.position.set(0.4, 1.6, 0); group.add(ankh);
        // Glow
        var glow = new THREE.PointLight(0x6666cc, 0.4, 8);
        glow.position.y = 1; group.add(glow);

        group.position.set(x, 1, z);
        scene.add(group);
        npcs.push({ id: 'priest', mesh: group, x: x, z: z, type: 'priest', interacted: false, glow: glow, floatPhase: Math.random() * Math.PI * 2 });
    }

    function spawnMerchant(scene, x, z) {
        var group = new THREE.Group();
        var bodyMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 });
        group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 1.6, 8), bodyMat));
        // Head with turban
        var headMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.8 });
        var head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), headMat);
        head.position.y = 1.1; group.add(head);
        var turban = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 }));
        turban.position.y = 1.25; turban.scale.set(1, 0.6, 1); group.add(turban);
        // Eyes
        var eyeMat = new THREE.MeshStandardMaterial({ color: 0x332200 });
        group.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), eyeMat).translateX(-0.08).translateY(1.12).translateZ(0.22));
        group.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), eyeMat).translateX(0.08).translateY(1.12).translateZ(0.22));
        // Lamp
        var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6),
            new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 0.6 }));
        lamp.position.set(-0.4, 0.8, 0); group.add(lamp);
        var lLight = new THREE.PointLight(0xffaa44, 0.5, 6);
        lLight.position.set(-0.4, 0.9, 0); group.add(lLight);

        group.position.set(x, 0.8, z);
        scene.add(group);
        npcs.push({ id: 'merchant', mesh: group, x: x, z: z, type: 'merchant', interacted: false });
    }

    function spawnHieroglyphs(scene) {
        // Place hieroglyph stone tablets around the world
        var positions = [
            [42, -35], [-12, 32], [-42, -20], [22, 22], [62, 12],
            [-56, 48], [28, 57], [72, 48], [15, -52], [-20, -35],
            [50, 15], [-48, 20]
        ];
        positions.forEach(function (pos, i) {
            if (i >= HIEROGLYPHS.length) return;
            var tablet = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.2),
                new THREE.MeshStandardMaterial({ color: 0x8b7d5e, roughness: 0.85 }));
            tablet.position.set(pos[0], 1, pos[1]); tablet.rotation.y = Math.random() * Math.PI;
            scene.add(tablet);
            // Glow
            var hGlow = new THREE.PointLight(0xffcc44, 0.15, 4);
            hGlow.position.set(pos[0], 1.2, pos[1]); scene.add(hGlow);
            npcs.push({ id: 'hiero_' + i, mesh: tablet, x: pos[0], z: pos[1], type: 'hieroglyph', hieroIndex: i, decoded: false, glow: hGlow });
        });
    }

    // ============ UPDATE ============
    function update(dt, playerX, playerZ, gameMinute, artifactsCollected, totalArtifacts) {
        interactTarget = null;
        // Animate NPCs
        for (var ni = 0; ni < npcs.length; ni++) {
            var npc = npcs[ni];
            var dx = playerX - npc.x, dz = playerZ - npc.z;
            var dist = Math.sqrt(dx * dx + dz * dz);

            if (npc.type === 'priest') {
                // Ghost float
                npc.floatPhase += dt * 1.5;
                npc.mesh.position.y = 1 + Math.sin(npc.floatPhase) * 0.15;
                if (npc.glow) npc.glow.intensity = 0.3 + Math.sin(npc.floatPhase * 2) * 0.15;
                npc.mesh.lookAt(playerX, 1, playerZ);
            }

            // Check interaction range
            if (dist < 3.5) {
                if (npc.type === 'priest' && !npc.interacted) {
                    interactTarget = { type: 'priest', npc: npc, prompt: 'Press E to speak with the ghost priest' };
                } else if (npc.type === 'priest' && npc.interacted) {
                    interactTarget = { type: 'priest_talk', npc: npc, prompt: 'Press E to ask Imhotep for guidance' };
                } else if (npc.type === 'merchant') {
                    interactTarget = { type: 'merchant', npc: npc, prompt: 'Press E to trade with Khamun' };
                } else if (npc.type === 'hieroglyph' && !npc.decoded) {
                    interactTarget = { type: 'hieroglyph', npc: npc, prompt: 'Press E to decode hieroglyph' };
                }
            }
        }

        // Update quest progress
        updateQuestProgress(dt, playerX, playerZ, gameMinute, artifactsCollected);

        // Cutscene
        if (isCutscenePlaying) { updateCutscene(dt); }

        return interactTarget;
    }

    function updateQuestProgress(dt, px, pz, gameMinute, artCount) {
        var hour = gameMinute / 60;
        for (var qi = 0; qi < activeQuests.length; qi++) {
            var q = activeQuests[qi];
            var def = getQuestDef(q.id);
            if (!def) continue;

            if (def.type === 'survive_night') {
                if (hour >= 20 && !q.nightStart) { q.nightStart = true; q.startingSanity = 100; }
                if (q.nightStart && hour >= 5 && hour < 6) {
                    completeQuest(q.id);
                }
            }
            if (def.type === 'escort' && q.escortActive) {
                var priest = findNPC('priest');
                if (priest) {
                    var edx = px - priest.x, edz = pz - priest.z;
                    if (Math.sqrt(edx * edx + edz * edz) < 15) {
                        q.escortProgress = (q.escortProgress || 0) + dt;
                        // Move priest toward sphinx
                        var toX = 20 - priest.x, toZ = 25 - priest.z;
                        var toDist = Math.sqrt(toX * toX + toZ * toZ);
                        if (toDist > 2) {
                            priest.x += (toX / toDist) * 1.5 * dt;
                            priest.z += (toZ / toDist) * 1.5 * dt;
                            priest.mesh.position.set(priest.x, priest.mesh.position.y, priest.z);
                        } else { completeQuest(q.id); }
                    }
                }
            }
        }
    }

    // ============ INTERACTION ============
    function interact(artifactsCollected, totalArtifacts, currentSanity) {
        if (!interactTarget) return null;
        var result = { action: null };

        if (interactTarget.type === 'priest' && !interactTarget.npc.interacted) {
            interactTarget.npc.interacted = true;
            playCutscene('priest_meet');
            startQuest('q_priest1');
            result.action = 'cutscene';
        } else if (interactTarget.type === 'priest_talk') {
            // Give hint about nearest artifact
            result.action = 'hint';
            result.message = getHint(artifactsCollected);
        } else if (interactTarget.type === 'merchant') {
            if (!interactTarget.npc.interacted) {
                interactTarget.npc.interacted = true;
                playCutscene('merchant_intro');
                startQuest('q_merchant');
                result.action = 'cutscene';
            } else {
                result.action = 'open_merchant';
            }
        } else if (interactTarget.type === 'hieroglyph') {
            var idx = interactTarget.npc.hieroIndex;
            if (idx < HIEROGLYPHS.length) {
                interactTarget.npc.decoded = true;
                var entry = HIEROGLYPHS[idx];
                codexEntries.push(entry);
                if (interactTarget.npc.glow) interactTarget.npc.glow.intensity = 0.5;
                result.action = 'codex_unlock';
                result.entry = entry;
                // Progress codex quests
                progressQuest('q_hieroglyph1', 1);
                progressQuest('q_hieroglyph2', 1);
            }
        }
        return result;
    }

    function getHint(artCount) {
        var hints = [
            '"The Eye of Horus glows near the Great Pyramid. Look to the east side."',
            '"I sense an artifact near the temple. The altar hides many secrets."',
            '"The Nile waters whisper of treasure near the docks."',
            '"Far east, among the dunes, a relic waits."',
            '"The oasis palms shelter something sacred."',
            '"In the deep desert, south of all light, a crown awaits."',
            '"You have gathered many, brave one. The altar calls you."'
        ];
        return hints[Math.min(artCount, hints.length - 1)];
    }

    // ============ QUEST MANAGEMENT ============
    function startQuest(id) {
        if (activeQuests.find(function (q) { return q.id === id; }) || completedQuests.indexOf(id) >= 0) return;
        var def = getQuestDef(id);
        if (!def) return;
        if (def.requires && completedQuests.indexOf(def.requires) < 0) return;
        var quest = { id: id, progress: 0 };
        activeQuests.push(quest);
        // Auto-start related quests
        autoStartQuests();
        return quest;
    }

    function autoStartQuests() {
        QUEST_DEFS.forEach(function (def) {
            if (activeQuests.find(function (q) { return q.id === def.id; }) || completedQuests.indexOf(def.id) >= 0) return;
            if (!def.requires || completedQuests.indexOf(def.requires) >= 0) {
                if (def.type !== 'ending') {
                    activeQuests.push({ id: def.id, progress: 0 });
                }
            }
        });
    }

    function progressQuest(id, amount) {
        var q = activeQuests.find(function (q) { return q.id === id; });
        if (!q) return;
        var def = getQuestDef(id);
        if (!def || !def.goal) return;
        q.progress = (q.progress || 0) + amount;
        if (q.progress >= def.goal) completeQuest(id);
    }

    function completeQuest(id) {
        var idx = activeQuests.findIndex(function (q) { return q.id === id; });
        if (idx < 0) return null;
        activeQuests.splice(idx, 1);
        completedQuests.push(id);
        var def = getQuestDef(id);
        if (!def) return null;
        // Give rewards
        if (def.reward.gold) gold += def.reward.gold;
        if (def.reward.codex) {
            var entry = HIEROGLYPHS.find(function (h) { return h.id === def.reward.codex; });
            if (entry && !codexEntries.find(function (e) { return e.id === entry.id; })) codexEntries.push(entry);
        }
        // Unlock dependent quests
        autoStartQuests();
        return def;
    }

    function getQuestDef(id) { return QUEST_DEFS.find(function (d) { return d.id === id; }); }
    function findNPC(id) { return npcs.find(function (n) { return n.id === id; }); }

    // ============ MERCHANT ============
    function buyItem(itemId) {
        var item = merchantItems.find(function (i) { return i.id === itemId; });
        if (!item || item.stock <= 0 || gold < item.price) return null;
        gold -= item.price;
        item.stock--;
        progressQuest('q_merchant', item.price);
        return item;
    }

    function getMerchantItems() { return merchantItems; }

    // ============ CUTSCENES ============
    function playCutscene(id) {
        if (!CUTSCENES[id]) return;
        isCutscenePlaying = true;
        currentCutscene = { lines: CUTSCENES[id].slice(), lineIndex: 0, charIndex: 0, displayText: '', timer: 0 };
        var overlay = document.getElementById('cutscene-overlay');
        if (overlay) overlay.style.display = 'flex';
    }

    function updateCutscene(dt) {
        if (!currentCutscene) return;
        currentCutscene.timer += dt;
        var line = currentCutscene.lines[currentCutscene.lineIndex];
        if (!line) { endCutscene(); return; }
        // Typewriter effect
        if (currentCutscene.charIndex < line.length) {
            var charsPerSec = 40;
            currentCutscene.charIndex = Math.min(line.length, Math.floor(currentCutscene.timer * charsPerSec));
            currentCutscene.displayText = line.substring(0, currentCutscene.charIndex);
        } else if (currentCutscene.timer > line.length / 40 + 2) {
            // Auto advance
            currentCutscene.lineIndex++;
            currentCutscene.charIndex = 0;
            currentCutscene.timer = 0;
            currentCutscene.displayText = '';
        }
        var textEl = document.getElementById('cutscene-text');
        if (textEl) textEl.textContent = currentCutscene.displayText;
    }

    function skipCutscene() {
        if (!currentCutscene) return;
        if (currentCutscene.charIndex < currentCutscene.lines[currentCutscene.lineIndex].length) {
            currentCutscene.charIndex = currentCutscene.lines[currentCutscene.lineIndex].length;
            currentCutscene.timer = 999;
        } else {
            currentCutscene.lineIndex++; currentCutscene.charIndex = 0; currentCutscene.timer = 0;
            if (currentCutscene.lineIndex >= currentCutscene.lines.length) endCutscene();
        }
    }

    function endCutscene() {
        isCutscenePlaying = false; currentCutscene = null;
        var overlay = document.getElementById('cutscene-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    // ============ CODEX RENDERING ============
    function renderCodex() {
        var loreEl = document.getElementById('codex-lore');
        var questEl = document.getElementById('codex-quests');
        var bestEl = document.getElementById('codex-bestiary');
        if (!loreEl) return;

        // Lore
        var loreHTML = '';
        HIEROGLYPHS.forEach(function (h) {
            var found = codexEntries.find(function (e) { return e.id === h.id; });
            if (found) {
                loreHTML += '<div class="codex-entry"><h4>𓂀 ' + h.title + '</h4><p>' + h.text + '</p><p style="color:#888;font-size:11px;margin-top:6px;">Found: ' + h.location + '</p></div>';
            } else {
                loreHTML += '<div class="codex-entry locked"><h4>𓂀 ???</h4><p>Undeciphered hieroglyph. Find and decode this inscription.</p></div>';
            }
        });
        loreEl.innerHTML = loreHTML;

        // Quests
        var questHTML = '';
        QUEST_DEFS.forEach(function (def) {
            var isActive = activeQuests.find(function (q) { return q.id === def.id; });
            var isComplete = completedQuests.indexOf(def.id) >= 0;
            var statusClass = isComplete ? 'complete' : (isActive ? 'active' : 'locked');
            var statusText = isComplete ? '✅ Complete' : (isActive ? '🔸 Active' + (def.goal ? ' (' + (isActive.progress || 0) + '/' + def.goal + ')' : '') : '🔒 Locked');
            questHTML += '<div class="quest-entry"><h4>' + def.title + '</h4><p style="font-size:13px;color:#bba870;">' + def.desc + '</p>';
            if (def.reward.gold > 0) questHTML += '<p style="font-size:12px;color:#ffd700;">Reward: ' + def.reward.gold + ' gold</p>';
            questHTML += '<div class="quest-status ' + statusClass + '">' + statusText + '</div></div>';
        });
        questEl.innerHTML = questHTML;

        // Bestiary
        var enemies = [
            { name: 'Mummy', icon: '🧟', desc: 'Cursed priests wrapped in linen. Patrol near pyramids. Faster at night. Afraid of fire.', found: true },
            { name: 'Anubis Guard', icon: '🐺', desc: 'Jackal-headed warriors of the god Anubis. Very fast. Guard the temple.', found: true },
            { name: 'Scarab Swarm', icon: '🪲', desc: 'Cursed insects that attack in darkness. Light repels them. Drain sanity.', found: true },
            { name: 'Skeleton Warrior', icon: '💀', desc: 'Ancient soldiers patrolling the catacombs. Wield bronze swords.', found: codexEntries.find(function (e) { return e.id === 'catacomb'; }) },
            { name: 'Nile Crocodile', icon: '🐊', desc: 'Massive reptilian demons lurking in underwater caves.', found: codexEntries.find(function (e) { return e.id === 'nile'; }) },
        ];
        var bestHTML = '';
        enemies.forEach(function (e) {
            if (e.found) {
                bestHTML += '<div class="codex-entry"><h4>' + e.icon + ' ' + e.name + '</h4><p>' + e.desc + '</p></div>';
            } else {
                bestHTML += '<div class="codex-entry locked"><h4>❓ Unknown Creature</h4><p>Undiscovered. Explore to learn more.</p></div>';
            }
        });
        bestEl.innerHTML = bestHTML;
    }

    // ============ MERCHANT UI ============
    function renderMerchant() {
        var goldEl = document.getElementById('merchant-gold');
        if (goldEl) goldEl.textContent = '💰 Gold: ' + gold;
        var grid = document.getElementById('merchant-grid');
        if (!grid) return;
        var html = '';
        merchantItems.forEach(function (item) {
            var soldClass = item.stock <= 0 ? ' sold' : '';
            var canBuy = gold >= item.price && item.stock > 0;
            html += '<div class="merchant-item' + soldClass + '" data-item="' + item.id + '">';
            html += '<h4>' + item.icon + ' ' + item.name + '</h4>';
            html += '<p>' + item.desc + '</p>';
            html += '<div class="price">' + (item.stock > 0 ? item.price + ' gold (x' + item.stock + ')' : 'SOLD OUT') + '</div>';
            html += '</div>';
        });
        grid.innerHTML = html;
    }

    // ============ ENDING SYSTEM ============
    function getEnding() {
        if (playerChoices.darknessEmbraced >= 3) return 'ending_dark';
        if (playerChoices.pharaohPath >= 3) return 'ending_pharaoh';
        return 'ending_free';
    }

    function makeChoice(choice) {
        if (choice === 'free') playerChoices.curseBroken++;
        if (choice === 'pharaoh') playerChoices.pharaohPath++;
        if (choice === 'dark') playerChoices.darknessEmbraced++;
    }

    function playEndingCutscene() {
        var ending = getEnding();
        playCutscene(ending);
        return ending;
    }

    function reset() {
        gold = 0; activeQuests = []; completedQuests = [];
        codexEntries = []; merchantItems = []; npcs = [];
        cutsceneQueue = []; isCutscenePlaying = false; currentCutscene = null;
        playerChoices = { curseBroken: 0, darknessEmbraced: 0, pharaohPath: 0 };
    }

    // Init codex tab switching
    setTimeout(function () {
        document.querySelectorAll('.codex-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                document.querySelectorAll('.codex-tab').forEach(function (t) { t.classList.remove('active'); });
                document.querySelectorAll('.codex-section').forEach(function (s) { s.classList.remove('active'); });
                tab.classList.add('active');
                var target = document.getElementById('codex-' + tab.dataset.tab);
                if (target) target.classList.add('active');
            });
        });
    }, 100);

    return {
        build: build, update: update, interact: interact, reset: reset,
        playCutscene: playCutscene, skipCutscene: skipCutscene, endCutscene: endCutscene,
        isCutscenePlaying: function () { return isCutscenePlaying; },
        renderCodex: renderCodex, renderMerchant: renderMerchant,
        buyItem: buyItem, getMerchantItems: getMerchantItems,
        startQuest: startQuest, progressQuest: progressQuest, completeQuest: completeQuest,
        makeChoice: makeChoice, playEndingCutscene: playEndingCutscene, getEnding: getEnding,
        getGold: function () { return gold; }, addGold: function (n) { gold += n; },
        getActiveQuests: function () { return activeQuests; },
        getCompletedQuests: function () { return completedQuests; },
        getCodexCount: function () { return codexEntries.length; },
        autoStartQuests: autoStartQuests
    };
})();
