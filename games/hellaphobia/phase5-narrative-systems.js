/* ============================================================
   HELLAPHOBIA - PHASE 5: NARRATIVE & STORY SYSTEMS
   Environmental Storytelling | Lore Collectibles | Multiple Endings
   ============================================================ */

(function() {
    'use strict';

    // ===== PHASE 5: STORY DATABASE =====
    const StoryDatabase = {
        // Main storyline
        MAIN_STORY: {
            intro: {
                id: 'intro',
                title: 'The Awakening',
                content: `You wake up in darkness. Your name is {playerName}, though you barely remember it. 
                         The last thing you recall is the accident... or was it an accident?
                         
                         The walls whisper your name. The shadows move with purpose.
                         You are not alone here. You were never alone.
                         
                         Escape. That is your only thought. But the dungeon has other plans.`,
                unlocked: true
            },
            phase1: {
                id: 'phase1',
                title: 'The Entrance',
                content: `They say the dungeon chooses its victims. You were chosen.
                         
                         The Entrance seems almost welcoming, but that's part of the trap.
                         Comfort before chaos. Hope before despair.
                         
                         You find a journal fragment: "Day 47. The walls are breathing. 
                         I think they're alive. I think they're hungry."`,
                unlocked: false
            },
            phase5: {
                id: 'phase5',
                title: 'The Warden',
                content: `The Warden was once a man. Now he is the dungeon's fist.
                         
                         He collects souls like trophies. Each death makes him stronger.
                         Defeat him, and you take his power. Fail, and join his collection.
                         
                         "I was like you once," he whispers. "Now I am eternal."`,
                unlocked: false
            },
            phase10: {
                id: 'phase10',
                title: 'The Collector',
                content: `The Collector doesn't kill for sport. She kills for art.
                         
                         Every death is a masterpiece. Every scream, a symphony.
                         She has been watching you. She likes what she sees.
                         
                         "You will be my finest work," she promises.`,
                unlocked: false
            },
            phase15: {
                id: 'phase15',
                title: 'Hellaphobia Core',
                content: `The Core is not a place. It is a consciousness.
                         
                         The dungeon is alive. It feeds on fear. It grows with every death.
                         You are not escaping. You are being digested.
                         
                         But consciousness can be fought. Fear can be conquered.
                         This is the final test.`,
                unlocked: false
            }
        },

        // Lore collectibles scattered throughout
        LORE_ENTRIES: [
            {
                id: 'lore_001',
                title: 'First Victim',
                content: `Name: Unknown\nDate: ???\n\n"I don't remember how I got here. One moment I was sleeping, the next... darkness. The walls are soft. Organic. I think I'm inside something."`,
                location: { phase: 1, x: 500, y: 300 },
                found: false
            },
            {
                id: 'lore_002',
                title: 'The Breathing Walls',
                content: `Day 12. The walls pulse with a rhythm. In. Out. Like lungs. 
                        
I've started marking time by the breathing. When the walls expand, the monsters sleep. When they contract, they hunt.

I think the dungeon is alive.`,
                location: { phase: 2, x: 800, y: 250 },
                found: false
            },
            {
                id: 'lore_003',
                title: 'The Others',
                content: `I found bones today. Human bones. Arranged in patterns.

There were others here before me. Many others. The dungeon has been feeding for a long time.

I am not the first. I will not be the last.`,
                location: { phase: 3, x: 1200, y: 400 },
                found: false
            },
            {
                id: 'lore_004',
                title: 'The Warden\'s Origin',
                content: `He was a prisoner once. Like us. But he made a deal.

"Serve the dungeon," it whispered. "And live forever."

He serves still. Collecting souls. Feeding the beast.

Some say you can see his humanity in his eyes. If you look closely. If you dare.`,
                location: { phase: 5, x: 1000, y: 350 },
                found: false
            },
            {
                id: 'lore_005',
                title: 'Mirrors Lie',
                content: `The Mirror Maze shows you what you fear most.

I saw myself. Old. Decayed. Still trapped here after decades.

The reflection smiled at me. A smile I never made.

I broke every mirror I could find.`,
                location: { phase: 4, x: 600, y: 300 },
                found: false
            },
            {
                id: 'lore_006',
                title: 'Flesh and Blood',
                content: `The Flesh Gardens are growing. I watched a wall split open today. Something crawled out.

The dungeon is reproducing. Creating new horrors from its own flesh.

We are not escaping a place. We are escaping a creature.`,
                location: { phase: 6, x: 900, y: 280 },
                found: false
            },
            {
                id: 'lore_007',
                title: 'Clockwork Heart',
                content: `Tick. Tock. Tick. Tock.

The Clockwork Hell keeps perfect time. But time moves differently here.

Some prisoners age years in hours. Others remain young for decades.

Time is a weapon in this place.`,
                location: { phase: 7, x: 1100, y: 320 },
                found: false
            },
            {
                id: 'lore_008',
                title: 'The Void Whispers',
                content: `In the Void Corridors, you can hear them. The ones who gave up.

They stopped running. Stopped fighting. Now they are part of the darkness.

"Join us," they whisper. "Rest forever."

It sounds so peaceful.`,
                location: { phase: 8, x: 700, y: 300 },
                found: false
            },
            {
                id: 'lore_009',
                title: 'Memory Fragments',
                content: `The Memory Hall shows you your past. But it lies.

It showed me my family. Happy. Alive. But I remember now. They died years ago.

The dungeon uses your memories against you. Twists them. Weaponizes them.

Don't trust what you see.`,
                location: { phase: 9, x: 1000, y: 350 },
                found: false
            },
            {
                id: 'lore_010',
                title: 'The Collector\'s Gallery',
                content: `She keeps trophies. Not of bodies, but of moments.

The moment of realization. The moment of despair. The final moment.

She has captured thousands. Each one perfect. Each one unique.

She wants to add you to her collection.`,
                location: { phase: 10, x: 800, y: 300 },
                found: false
            },
            {
                id: 'lore_011',
                title: 'Abyssal Secrets',
                content: `Deep in the Abyss, I found something impossible. Light.

A single candle, burning without fuel. It has burned for centuries.

The darkness fears it. The monsters avoid it.

Hope exists even here.`,
                location: { phase: 11, x: 1200, y: 400 },
                found: false
            },
            {
                id: 'lore_012',
                title: 'The Library\'s Truth',
                content: `The Library contains every death. Every scream. Every tear.

I found my own name in the books. My death, recorded hundreds of times.

"Died in Phase 1." "Died in Phase 5." "Died in Phase 12."

I have died here before. Many times.`,
                location: { phase: 12, x: 900, y: 320 },
                found: false
            },
            {
                id: 'lore_013',
                title: 'Reality Fractures',
                content: `The dungeon is breaking. Reality is cracking.

I saw myself today. Another version. He was running. I was hiding.

We are all here. Every version of us. Every choice we made.

The dungeon exists in all realities. Feeds in all timelines.`,
                location: { phase: 13, x: 1000, y: 350 },
                found: false
            },
            {
                id: 'lore_014',
                title: 'The Final Truth',
                content: `I understand now. The dungeon is not a prison. It is a filter.

It tests us. Breaks us. Rebuilds us.

Those who survive become something more. Something eternal.

The Warden. The Collector. They are not enemies. They are graduates.

I can become like them. Or I can escape.

The choice is mine.`,
                location: { phase: 14, x: 1100, y: 380 },
                found: false
            },
            {
                id: 'lore_015',
                title: 'The Core\'s Secret',
                content: `The Core is vulnerable. It fears true courage.

Not the absence of fear. Fear is its food.

True courage is fear acknowledged. Fear faced. Fear conquered.

The dungeon cannot digest courage. It chokes on it.

Be brave. Not fearless. Brave.

That is how you win.`,
                location: { phase: 15, x: 1000, y: 400 },
                found: false
            }
        ],

        // Character backstories
        CHARACTERS: {
            player: {
                name: '{playerName}',
                backstory: `A normal person in abnormal circumstances. 
                           Before the dungeon, you lived an ordinary life.
                           Now you fight for survival in a nightmare.
                           
                           Your past is a memory. Your future is uncertain.
                           But you are still human. Still fighting. Still hoping.
                           
                           That is your strength.`,
                memories: []
            },
            warden: {
                name: 'The Warden',
                backstory: `Once a prisoner like you. He survived 100 phases.
                            
But survival has a cost. He made a deal to become eternal.
Now he serves the dungeon, collecting souls for his master.

Part of him still remembers humanity. That part weeps.
But the dungeon's grip is absolute.`,
                memories: []
            },
            collector: {
                name: 'The Collector',
                backstory: `An artist in a previous life. She found beauty in suffering.
                            
The dungeon amplified her gift. Now she creates masterpieces from death.
Each kill is a sculpture. Each scream, a symphony.

She doesn't understand why you resist. Death is art.
Why wouldn't you want to be beautiful?`,
                memories: []
            },
            core: {
                name: 'Hellaphobia',
                backstory: `Not a monster. Not a god. A consciousness that feeds on fear.
                             
It has existed since the first nightmare. It will exist until the last.
Every horror story feeds it. Every scream makes it stronger.

You are not its first victim. You will not be its last.
But you might be the one who understands it.`,
                memories: []
            }
        },

        // Ending conditions
        ENDINGS: {
            escape: {
                id: 'escape',
                name: 'The Survivor',
                description: 'You escaped the dungeon. But it stays with you.',
                condition: 'Complete all 15 phases without dying more than 50 times',
                unlocked: false
            },
            sacrifice: {
                id: 'sacrifice',
                name: 'The Martyr',
                description: 'You gave your life so others might escape.',
                condition: 'Die 100+ times but reach Phase 15',
                unlocked: false
            },
            warden: {
                id: 'warden',
                name: 'The New Warden',
                description: 'You defeated the Warden and took his place.',
                condition: 'Defeat the Warden with less than 10 deaths',
                unlocked: false
            },
            collector: {
                id: 'collector',
                name: 'The Artist',
                description: 'The Collector recognized your potential.',
                condition: 'Die to the Collector 5+ times, then defeat her',
                unlocked: false
            },
            truth: {
                id: 'truth',
                name: 'The Awakened',
                description: 'You discovered the dungeon\'s true nature.',
                condition: 'Collect all 15 lore entries',
                unlocked: false
            },
            eternal: {
                id: 'eternal',
                name: 'The Eternal',
                description: 'You became part of the dungeon forever.',
                condition: 'Play for 10+ hours total',
                unlocked: false
            },
            speed: {
                id: 'speed',
                name: 'The Speedrunner',
                description: 'You conquered the dungeon in record time.',
                condition: 'Complete all phases in under 30 minutes',
                unlocked: false
            },
            pacifist: {
                id: 'pacifist',
                name: 'The Pacifist',
                description: 'You survived without killing a single monster.',
                condition: 'Complete game without killing any monsters',
                unlocked: false
            }
        }
    };

    // ===== PHASE 5: STORY MANAGER =====
    const StoryManager = {
        currentChapter: 'intro',
        discoveredLore: [],
        storyProgress: 0,
        playerChoices: [],
        
        init() {
            this.loadProgress();
            console.log('Phase 5: Narrative Systems initialized');
        },
        
        // Unlock story chapter
        unlockChapter(chapterId) {
            if (StoryDatabase.MAIN_STORY[chapterId]) {
                StoryDatabase.MAIN_STORY[chapterId].unlocked = true;
                this.currentChapter = chapterId;
                this.showChapter(chapterId);
                this.saveProgress();
            }
        },
        
        // Show chapter content
        showChapter(chapterId) {
            const chapter = StoryDatabase.MAIN_STORY[chapterId];
            if (!chapter) return;
            
            Phase5UI.showStoryModal(chapter.title, chapter.content);
        },
        
        // Check for lore at position
        checkLore(playerX, playerY, phase) {
            for (const lore of StoryDatabase.LORE_ENTRIES) {
                if (lore.found) continue;
                if (lore.location.phase !== phase) continue;
                
                const dx = playerX - lore.location.x;
                const dy = playerY - lore.location.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 50) {
                    this.discoverLore(lore.id);
                    return lore;
                }
            }
            return null;
        },
        
        // Discover lore entry
        discoverLore(loreId) {
            const lore = StoryDatabase.LORE_ENTRIES.find(l => l.id === loreId);
            if (!lore || lore.found) return;
            
            lore.found = true;
            this.discoveredLore.push(loreId);
            
            Phase5UI.showLoreDiscovery(lore.title, lore.content);
            Phase5Audio.playDiscoverySound();
            
            this.checkEndingConditions();
            this.saveProgress();
        },
        
        // Record player choice
        recordChoice(choiceId, choice) {
            this.playerChoices.push({
                id: choiceId,
                choice: choice,
                time: Date.now(),
                phase: this.currentChapter
            });
            this.saveProgress();
        },
        
        // Check ending conditions
        checkEndingConditions(stats) {
            const endings = StoryDatabase.ENDINGS;
            
            // Check each ending condition
            if (stats && stats.deaths <= 50 && stats.phase >= 15) {
                this.unlockEnding('escape');
            }
            
            if (stats && stats.deaths >= 100 && stats.phase >= 15) {
                this.unlockEnding('sacrifice');
            }
            
            if (this.discoveredLore.length >= 15) {
                this.unlockEnding('truth');
            }
            
            // Check playtime
            const playtime = this.getTotalPlaytime();
            if (playtime >= 10 * 60 * 60 * 1000) { // 10 hours
                this.unlockEnding('eternal');
            }
        },
        
        // Unlock ending
        unlockEnding(endingId) {
            const ending = StoryDatabase.ENDINGS[endingId];
            if (!ending || ending.unlocked) return;
            
            ending.unlocked = true;
            Phase5UI.showEndingUnlocked(ending);
            Phase5Audio.playEndingUnlockedSound();
            this.saveProgress();
        },
        
        // Get total playtime
        getTotalPlaytime() {
            const saved = localStorage.getItem('hellaphobia_playtime');
            return parseInt(saved || '0');
        },
        
        // Add playtime
        addPlaytime(ms) {
            const current = this.getTotalPlaytime();
            localStorage.setItem('hellaphobia_playtime', current + ms);
        },
        
        // Get story summary
        getStorySummary() {
            return {
                currentChapter: this.currentChapter,
                discoveredLore: this.discoveredLore.length,
                totalLore: StoryDatabase.LORE_ENTRIES.length,
                choices: this.playerChoices.length,
                endings: Object.values(StoryDatabase.ENDINGS).filter(e => e.unlocked).length
            };
        },
        
        // Save progress
        saveProgress() {
            const data = {
                currentChapter: this.currentChapter,
                discoveredLore: this.discoveredLore,
                playerChoices: this.playerChoices,
                endings: Object.entries(StoryDatabase.ENDINGS)
                    .filter(([_, e]) => e.unlocked)
                    .map(([id, _]) => id)
            };
            localStorage.setItem('hellaphobia_story', JSON.stringify(data));
        },
        
        // Load progress
        loadProgress() {
            const saved = localStorage.getItem('hellaphobia_story');
            if (saved) {
                const data = JSON.parse(saved);
                this.currentChapter = data.currentChapter || 'intro';
                this.discoveredLore = data.discoveredLore || [];
                this.playerChoices = data.playerChoices || [];
                
                // Restore found lore status
                for (const loreId of this.discoveredLore) {
                    const lore = StoryDatabase.LORE_ENTRIES.find(l => l.id === loreId);
                    if (lore) lore.found = true;
                }
                
                // Restore unlocked endings
                for (const endingId of (data.endings || [])) {
                    if (StoryDatabase.ENDINGS[endingId]) {
                        StoryDatabase.ENDINGS[endingId].unlocked = true;
                    }
                }
            }
        }
    };

    // ===== PHASE 5: ENVIRONMENTAL STORYTELLING =====
    const EnvironmentalStory = {
        // Generate environmental clues
        generateClues(phase, levelData) {
            const clues = [];
            
            // Blood messages on walls
            if (phase > 2) {
                const messages = [
                    "TURN BACK",
                    "IT'S WATCHING",
                    "DON'T TRUST THE LIGHT",
                    "SHE'S BEHIND YOU",
                    "RUN"
                ];
                
                for (let i = 0; i < 3; i++) {
                    const x = 300 + Math.random() * (levelData.width - 600);
                    const y = levelData.height - 150 - Math.random() * 100;
                    
                    clues.push({
                        type: 'blood_message',
                        x, y,
                        text: messages[Math.floor(Math.random() * messages.length)],
                        discovered: false
                    });
                }
            }
            
            // Skeletons in poses
            if (phase > 3) {
                const poses = ['cowering', 'reaching', 'praying', 'running'];
                for (let i = 0; i < 2; i++) {
                    const x = 400 + Math.random() * (levelData.width - 800);
                    const y = levelData.height - 100;
                    
                    clues.push({
                        type: 'skeleton',
                        x, y,
                        pose: poses[Math.floor(Math.random() * poses.length)],
                        discovered: false
                    });
                }
            }
            
            // Scratched tally marks
            if (phase > 1) {
                const x = 200 + Math.random() * (levelData.width - 400);
                const y = levelData.height - 200;
                const days = Math.floor(Math.random() * 100) + 1;
                
                clues.push({
                    type: 'tally_marks',
                    x, y,
                    count: days,
                    discovered: false
                });
            }
            
            return clues;
        },
        
        // Render environmental clues
        renderClues(ctx, clues, camera) {
            for (const clue of clues) {
                const cx = clue.x - camera.x;
                const cy = clue.y - camera.y;
                
                // Skip if off-screen
                if (cx < -100 || cx > canvas.width + 100) continue;
                
                ctx.save();
                
                switch (clue.type) {
                    case 'blood_message':
                        ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
                        ctx.font = 'bold 20px Creepster';
                        ctx.save();
                        ctx.translate(cx, cy);
                        ctx.rotate((Math.random() - 0.5) * 0.2);
                        ctx.fillText(clue.text, 0, 0);
                        ctx.restore();
                        break;
                        
                    case 'skeleton':
                        ctx.fillStyle = '#aaaaaa';
                        this.drawSkeleton(ctx, cx, cy, clue.pose);
                        break;
                        
                    case 'tally_marks':
                        ctx.strokeStyle = '#664433';
                        ctx.lineWidth = 2;
                        this.drawTallyMarks(ctx, cx, cy, clue.count);
                        break;
                }
                
                ctx.restore();
            }
        },
        
        drawSkeleton(ctx, x, y, pose) {
            // Simplified skeleton drawing based on pose
            ctx.save();
            ctx.translate(x, y);
            
            switch (pose) {
                case 'cowering':
                    // Curled up
                    ctx.beginPath();
                    ctx.arc(0, -10, 15, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'reaching':
                    // Arm extended
                    ctx.fillRect(-5, -30, 10, 30);
                    ctx.fillRect(0, -20, 20, 5);
                    break;
                case 'praying':
                    // Hands together
                    ctx.fillRect(-8, -30, 16, 30);
                    break;
                case 'running':
                    // Dynamic pose
                    ctx.fillRect(-5, -30, 10, 30);
                    ctx.fillRect(-15, -15, 10, 5);
                    ctx.fillRect(5, -25, 10, 5);
                    break;
            }
            
            ctx.restore();
        },
        
        drawTallyMarks(ctx, x, y, count) {
            const groups = Math.floor(count / 5);
            const remainder = count % 5;
            
            ctx.save();
            ctx.translate(x, y);
            
            for (let g = 0; g < groups; g++) {
                // Draw group of 5
                for (let i = 0; i < 4; i++) {
                    ctx.beginPath();
                    ctx.moveTo(g * 30 + i * 6, 0);
                    ctx.lineTo(g * 30 + i * 6, 20);
                    ctx.stroke();
                }
                // Diagonal line
                ctx.beginPath();
                ctx.moveTo(g * 30, 0);
                ctx.lineTo(g * 30 + 18, 20);
                ctx.stroke();
            }
            
            // Draw remainder
            for (let i = 0; i < remainder; i++) {
                ctx.beginPath();
                ctx.moveTo(groups * 30 + i * 6, 0);
                ctx.lineTo(groups * 30 + i * 6, 20);
                ctx.stroke();
            }
            
            ctx.restore();
        }
    };

    // ===== PHASE 5: DIALOGUE SYSTEM =====
    const DialogueSystem = {
        activeDialogue: null,
        dialogueHistory: [],
        
        // Start dialogue
        startDialogue(speaker, lines, options = []) {
            this.activeDialogue = {
                speaker: speaker,
                lines: lines,
                currentLine: 0,
                options: options,
                complete: false
            };
            
            Phase5UI.showDialogue(this.activeDialogue);
        },
        
        // Advance dialogue
        advance() {
            if (!this.activeDialogue) return;
            
            this.activeDialogue.currentLine++;
            
            if (this.activeDialogue.currentLine >= this.activeDialogue.lines.length) {
                if (this.activeDialogue.options.length > 0) {
                    Phase5UI.showDialogueOptions(this.activeDialogue.options);
                } else {
                    this.endDialogue();
                }
            } else {
                Phase5UI.updateDialogue(this.activeDialogue);
            }
        },
        
        // Select option
        selectOption(optionIndex) {
            if (!this.activeDialogue) return;
            
            const option = this.activeDialogue.options[optionIndex];
            
            // Record choice
            StoryManager.recordChoice('dialogue_' + Date.now(), option.text);
            
            // Execute callback if present
            if (option.callback) {
                option.callback();
            }
            
            this.endDialogue();
        },
        
        // End dialogue
        endDialogue() {
            if (this.activeDialogue) {
                this.dialogueHistory.push({
                    ...this.activeDialogue,
                    timestamp: Date.now()
                });
                this.activeDialogue = null;
            }
            
            Phase5UI.hideDialogue();
        },
        
        // Trigger boss dialogue
        triggerBossDialogue(bossId) {
            const dialogues = {
                warden: {
                    speaker: 'The Warden',
                    lines: [
                        "Another soul for my collection.",
                        "You think you can escape? I've seen thousands try.",
                        "They all fail. They all serve.",
                        "Will you be different?"
                    ],
                    options: [
                        { text: "I will escape.", callback: () => console.log('Defiant') },
                        { text: "What happened to you?", callback: () => console.log('Curious') },
                        { text: "...", callback: () => console.log('Silent') }
                    ]
                },
                collector: {
                    speaker: 'The Collector',
                    lines: [
                        "Oh, you're perfect.",
                        "The way you move. The fear in your eyes.",
                        "You will be my masterpiece.",
                        "Don't worry. Death is just the beginning of art."
                    ],
                    options: [
                        { text: "I'm not your art.", callback: () => console.log('Defiant') },
                        { text: "What do you want?", callback: () => console.log('Questioning') },
                        { text: "Stay back!", callback: () => console.log('Afraid') }
                    ]
                },
                core: {
                    speaker: 'Hellaphobia',
                    lines: [
                        "I know your fears.",
                        "I am your fears.",
                        "Every nightmare you've ever had. Every moment of terror.",
                        "They all feed me.",
                        "And you... you have fed me so well."
                    ],
                    options: [
                        { text: "I don't fear you.", callback: () => console.log('Brave') },
                        { text: "What are you?", callback: () => console.log('Curious') },
                        { text: "Let me go.", callback: () => console.log('Pleading') }
                    ]
                }
            };
            
            const dialogue = dialogues[bossId];
            if (dialogue) {
                this.startDialogue(dialogue.speaker, dialogue.lines, dialogue.options);
            }
        }
    };

    // ===== PHASE 5: UI HELPERS =====
    const Phase5UI = {
        showStoryModal(title, content) {
            console.log(`[STORY] ${title}: ${content}`);
            // Implementation would show actual UI modal
        },
        
        showLoreDiscovery(title, content) {
            console.log(`[LORE DISCOVERED] ${title}`);
            console.log(content);
        },
        
        showEndingUnlocked(ending) {
            console.log(`[ENDING UNLOCKED] ${ending.name}: ${ending.description}`);
        },
        
        showDialogue(dialogue) {
            const line = dialogue.lines[dialogue.currentLine];
            console.log(`${dialogue.speaker}: "${line}"`);
        },
        
        updateDialogue(dialogue) {
            this.showDialogue(dialogue);
        },
        
        showDialogueOptions(options) {
            console.log('Options:');
            options.forEach((opt, i) => {
                console.log(`  ${i + 1}. ${opt.text}`);
            });
        },
        
        hideDialogue() {
            console.log('[Dialogue ended]');
        }
    };

    // ===== PHASE 5: AUDIO HELPERS =====
    const Phase5Audio = {
        playDiscoverySound() {
            console.log('[Audio: Lore discovery sound]');
        },
        
        playEndingUnlockedSound() {
            console.log('[Audio: Ending unlocked sound]');
        }
    };

    // ===== PHASE 5: MAIN API =====
    const Phase5Core = {
        init() {
            StoryManager.init();
            console.log('Phase 5: Narrative & Story Systems initialized');
        },
        
        // Update (called each frame)
        update(player, phase) {
            // Check for lore discoveries
            const lore = StoryManager.checkLore(player.x, player.y, phase);
            
            // Update playtime
            StoryManager.addPlaytime(16); // ~16ms per frame at 60fps
        },
        
        // Story progression
        unlockChapter(chapterId) {
            StoryManager.unlockChapter(chapterId);
        },
        
        // Get story summary
        getStorySummary() {
            return StoryManager.getStorySummary();
        },
        
        // Dialogue
        startDialogue(speaker, lines, options) {
            DialogueSystem.startDialogue(speaker, lines, options);
        },
        
        triggerBossDialogue(bossId) {
            DialogueSystem.triggerBossDialogue(bossId);
        },
        
        // Environmental storytelling
        generateClues(phase, levelData) {
            return EnvironmentalStory.generateClues(phase, levelData);
        },
        
        renderClues(ctx, clues, camera) {
            EnvironmentalStory.renderClues(ctx, clues, camera);
        },
        
        // Endings
        checkEndingConditions(stats) {
            StoryManager.checkEndingConditions(stats);
        },
        
        getUnlockedEndings() {
            return Object.values(StoryDatabase.ENDINGS).filter(e => e.unlocked);
        },
        
        // Database access
        getStoryDatabase() {
            return StoryDatabase;
        }
    };

    // Export Phase 5 systems
    window.Phase5Core = Phase5Core;
    window.StoryManager = StoryManager;
    window.DialogueSystem = DialogueSystem;
    window.EnvironmentalStory = EnvironmentalStory;
    window.Phase5UI = Phase5UI;
    window.Phase5Audio = Phase5Audio;

})();
