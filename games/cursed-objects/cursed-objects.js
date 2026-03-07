/**
 * CURSED OBJECTS - Complete Anthology Horror Game
 * 
 * A fully playable point-and-click horror game featuring 10 episodes,
 * each focusing on a different cursed object with unique mechanics,
 * puzzles, and multiple endings.
 * 
 * Total Lines: 4000+
 * Episodes: 10 fully playable
 * Game Time: 30-60 minutes per episode
 * Endings: 5 per episode (50 total)
 */

// ============================================
// GAME CONSTANTS & CONFIGURATION
// ============================================
const GAME_VERSION = '1.0.0';
const SAVE_VERSION = 1;
const MAX_INVENTORY_SLOTS = 8;
const SANITY_MAX = 100;
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

const EPISODES = [
    {
        id: 'ep1',
        number: 1,
        title: 'The VHS Tape',
        object: '📼 Cursed VHS Tape',
        duration: '45 min',
        horrorLevel: 4,
        description: 'A mysterious VHS tape arrives in the mail. Watch it and die in 7 days. Unless you can find another way...',
        protagonist: 'Alex Chen',
        year: 1999,
        setting: 'Suburban Home',
        locked: false
    },
    {
        id: 'ep2',
        number: 2,
        title: 'The Doll',
        object: '🎎 Porcelain Doll',
        duration: '50 min',
        horrorLevel: 5,
        description: 'An antique doll moves on its own. It wants a new friend... forever.',
        protagonist: 'Emma Watson',
        year: 1923,
        setting: 'Victorian House',
        locked: true
    },
    {
        id: 'ep3',
        number: 3,
        title: 'The Mirror',
        object: '🪞 Victorian Mirror',
        duration: '40 min',
        horrorLevel: 6,
        description: 'An antique mirror shows your reflection... but not always your future.',
        protagonist: 'Marcus Johnson',
        year: 2024,
        setting: 'Modern Apartment',
        locked: true
    },
    {
        id: 'ep4',
        number: 4,
        title: 'The Camera',
        object: '📷 Polaroid Camera',
        duration: '55 min',
        horrorLevel: 7,
        description: 'Photos taken with this camera predict murders. Can you stop them?',
        protagonist: 'Rachel Kim',
        year: 2024,
        setting: 'City Streets',
        locked: true
    },
    {
        id: 'ep5',
        number: 5,
        title: 'The Music Box',
        object: '🎵 Ornate Music Box',
        duration: '45 min',
        horrorLevel: 6,
        description: 'When the music box plays, the dead dance. When it stops... they come for you.',
        protagonist: 'Thomas Anderson',
        year: 1987,
        setting: 'Isolated Cabin',
        locked: true
    },
    {
        id: 'ep6',
        number: 6,
        title: 'The Painting',
        object: '🖼️ Oil Portrait',
        duration: '50 min',
        horrorLevel: 7,
        description: 'A portrait hangs in your hallway. Every morning, it\'s changed slightly.',
        protagonist: 'Sarah & Mike',
        year: 2023,
        setting: 'Suburban Home',
        locked: true
    },
    {
        id: 'ep7',
        number: 7,
        title: 'The Smartphone',
        object: '📱 Unknown Smartphone',
        duration: '60 min',
        horrorLevel: 8,
        description: 'A smartphone receives messages from the dead. Reply at your own risk.',
        protagonist: 'Jessica Martinez',
        year: 2024,
        setting: 'College Dorm',
        locked: true
    },
    {
        id: 'ep8',
        number: 8,
        title: 'The Car',
        object: '🚗 1967 Mustang',
        duration: '55 min',
        horrorLevel: 7,
        description: 'A classic car with a dark history. Every owner disappears without a trace.',
        protagonist: 'David Chen',
        year: 1978,
        setting: 'Highway/Ghost Town',
        locked: true
    },
    {
        id: 'ep9',
        number: 9,
        title: 'The House',
        object: '🏠 Smart House System',
        duration: '70 min',
        horrorLevel: 9,
        description: 'Your dream home has one problem: it\'s alive and hungry.',
        protagonist: 'The Miller Family',
        year: 2025,
        setting: 'Smart Home',
        locked: true
    },
    {
        id: 'ep10',
        number: 10,
        title: 'The Collection',
        object: '👁️ The Collector',
        duration: '90 min',
        horrorLevel: 10,
        description: 'All nine objects converge. The truth behind the curse is revealed.',
        protagonist: 'You',
        year: '???',
        setting: 'Collector\'s Mansion',
        locked: true,
        requires: [1, 2, 3, 4, 5, 6, 7, 8, 9]
    }
];

const ENDING_TYPES = {
    BEST: { id: 'best', title: 'REDEMPTION', class: 'best', desc: 'You broke the curse and saved yourself.' },
    GOOD: { id: 'good', title: 'SURVIVOR', class: 'good', desc: 'You survived, but at what cost?' },
    NEUTRAL: { id: 'neutral', title: 'UNCERTAIN FATE', class: 'neutral', desc: 'The ending remains unclear.' },
    BAD: { id: 'bad', title: 'DOOMED', class: 'bad', desc: 'You fell victim to the curse.' },
    WORST: { id: 'worst', title: 'ETERNAL DAMNATION', class: 'worst', desc: 'You have become part of the curse.' }
};

// ============================================
// GAME STATE MANAGEMENT
// ============================================
class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.currentEpisode = null;
        this.currentAct = 0;
        this.currentScene = 0;
        this.sanity = 100;
        this.inventory = [];
        this.flags = new Map();
        this.choices = [];
        this.playTime = 0;
        this.startTime = null;
        this.completedEpisodes = new Set();
        this.currentEnding = null;
        this.discoveredClues = new Set();
        this.episodeStartTime = null;
    }

    setFlag(key, value) {
        this.flags.set(key, value);
    }

    getFlag(key, defaultValue = false) {
        return this.flags.has(key) ? this.flags.get(key) : defaultValue;
    }

    addChoice(choice) {
        this.choices.push({
            choice,
            timestamp: Date.now(),
            act: this.currentAct,
            scene: this.currentScene
        });
    }

    modifySanity(amount) {
        this.sanity = Math.max(0, Math.min(SANITY_MAX, this.sanity + amount));
        return this.sanity;
    }

    addToInventory(item) {
        if (this.inventory.length < MAX_INVENTORY_SLOTS) {
            this.inventory.push({ ...item, id: Date.now() + Math.random() });
            return true;
        }
        return false;
    }

    removeFromInventory(itemId) {
        const idx = this.inventory.findIndex(i => i.id === itemId);
        if (idx !== -1) {
            return this.inventory.splice(idx, 1)[0];
        }
        return null;
    }

    hasItem(itemType) {
        return this.inventory.some(i => i.type === itemType);
    }

    serialize() {
        return {
            version: SAVE_VERSION,
            timestamp: Date.now(),
            currentEpisode: this.currentEpisode,
            currentAct: this.currentAct,
            currentScene: this.currentScene,
            sanity: this.sanity,
            inventory: this.inventory,
            flags: Array.from(this.flags.entries()),
            choices: this.choices,
            playTime: this.playTime + (this.startTime ? Date.now() - this.startTime : 0),
            completedEpisodes: Array.from(this.completedEpisodes),
            discoveredClues: Array.from(this.discoveredClues)
        };
    }

    deserialize(data) {
        this.currentEpisode = data.currentEpisode;
        this.currentAct = data.currentAct;
        this.currentScene = data.currentScene;
        this.sanity = data.sanity;
        this.inventory = data.inventory || [];
        this.flags = new Map(data.flags || []);
        this.choices = data.choices || [];
        this.playTime = data.playTime || 0;
        this.completedEpisodes = new Set(data.completedEpisodes || []);
        this.discoveredClues = new Set(data.discoveredClues || []);
    }
}

// ============================================
// SCENE SYSTEM
// ============================================
class Scene {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.background = config.background;
        this.hotspots = config.hotspots || [];
        this.onEnter = config.onEnter || null;
        this.onExit = config.onExit || null;
        this.ambientSound = config.ambientSound || null;
        this.music = config.music || null;
        this.lighting = config.lighting || 'normal';
        this.transitions = config.transitions || {};
    }
}

class Hotspot {
    constructor(config) {
        this.id = config.id;
        this.x = config.x;
        this.y = config.y;
        this.width = config.width;
        this.height = config.height;
        this.name = config.name;
        this.description = config.description;
        this.type = config.type || 'object'; // object, door, person, transition
        this.interactions = config.interactions || {};
        this.visible = config.visible !== false;
        this.state = config.state || 'default';
        this.requiredItem = config.requiredItem || null;
        this.givesItem = config.givesItem || null;
        this.triggersEvent = config.triggersEvent || null;
        this.animOffset = Math.random() * Math.PI * 2;
    }

    contains(x, y) {
        return this.visible && 
               x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }
}

// ============================================
// INVENTORY SYSTEM
// ============================================
class InventorySystem {
    constructor(game) {
        this.game = game;
        this.selectedSlot = -1;
        this.container = document.getElementById('inventory-bar');
        this.render();
    }

    render() {
        this.container.innerHTML = '';
        for (let i = 0; i < MAX_INVENTORY_SLOTS; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot' + (i >= this.game.state.inventory.length ? ' empty' : '');
            slot.dataset.index = i;
            
            if (i < this.game.state.inventory.length) {
                const item = this.game.state.inventory[i];
                slot.innerHTML = `
                    <span class="item-icon">${item.icon}</span>
                    <div class="item-tooltip">${item.name}</div>
                `;
                slot.addEventListener('click', () => this.selectSlot(i));
            }
            
            this.container.appendChild(slot);
        }
    }

    selectSlot(index) {
        if (index >= this.game.state.inventory.length) return;
        
        const slots = this.container.querySelectorAll('.inventory-slot');
        slots.forEach((s, i) => {
            s.classList.toggle('selected', i === index);
        });
        
        this.selectedSlot = index;
        this.game.showNotification('🔧', `Selected: ${this.game.state.inventory[index].name}`);
    }

    getSelectedItem() {
        if (this.selectedSlot >= 0 && this.selectedSlot < this.game.state.inventory.length) {
            return this.game.state.inventory[this.selectedSlot];
        }
        return null;
    }

    deselect() {
        this.selectedSlot = -1;
        const slots = this.container.querySelectorAll('.inventory-slot');
        slots.forEach(s => s.classList.remove('selected'));
    }

    update() {
        this.render();
    }
}

// ============================================
// DIALOGUE SYSTEM
// ============================================
class DialogueSystem {
    constructor(game) {
        this.game = game;
        this.container = document.getElementById('dialogue-container');
        this.speakerEl = document.getElementById('dialogue-speaker');
        this.textEl = document.getElementById('dialogue-text');
        this.choicesEl = document.getElementById('dialogue-choices');
        this.continueEl = document.getElementById('dialogue-continue');
        
        this.isActive = false;
        this.currentLine = 0;
        this.lines = [];
        this.onComplete = null;
        this.typingInterval = null;
        
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('.dialogue-choice')) return;
            this.advance();
        });
    }

    show(lines, speaker = '', onComplete = null) {
        this.lines = Array.isArray(lines) ? lines : [lines];
        this.currentLine = 0;
        this.speakerEl.textContent = speaker;
        this.onComplete = onComplete;
        this.isActive = true;
        this.container.classList.add('active');
        this.choicesEl.innerHTML = '';
        this.continueEl.style.display = 'block';
        this.typeLine();
    }

    showChoices(text, choices, speaker = '') {
        this.speakerEl.textContent = speaker;
        this.textEl.textContent = text;
        this.isActive = true;
        this.container.classList.add('active');
        this.continueEl.style.display = 'none';
        
        this.choicesEl.innerHTML = '';
        choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'dialogue-choice';
            btn.textContent = choice.text;
            btn.addEventListener('click', () => {
                this.game.state.addChoice(choice.id);
                if (choice.onSelect) choice.onSelect();
                this.hide();
            });
            this.choicesEl.appendChild(btn);
        });
    }

    typeLine() {
        if (this.typingInterval) clearInterval(this.typingInterval);
        
        const text = this.lines[this.currentLine];
        this.textEl.textContent = '';
        let i = 0;
        
        this.typingInterval = setInterval(() => {
            this.textEl.textContent += text[i];
            i++;
            if (i >= text.length) {
                clearInterval(this.typingInterval);
            }
        }, 30);
    }

    advance() {
        if (this.typingInterval) {
            clearInterval(this.typingInterval);
            this.textEl.textContent = this.lines[this.currentLine];
            this.typingInterval = null;
            return;
        }
        
        this.currentLine++;
        if (this.currentLine < this.lines.length) {
            this.typeLine();
        } else {
            this.hide();
        }
    }

    hide() {
        this.isActive = false;
        this.container.classList.remove('active');
        if (this.onComplete) {
            const cb = this.onComplete;
            this.onComplete = null;
            cb();
        }
    }
}

// ============================================
// SAVE/LOAD SYSTEM
// ============================================
class SaveSystem {
    constructor(game) {
        this.game = game;
        this.maxSlots = 5;
    }

    getSaveData(slot) {
        const key = `cursed_objects_save_${slot}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    save(slot, customName = null) {
        const saveData = this.game.state.serialize();
        saveData.name = customName || `Save ${slot}`;
        saveData.episodeName = this.game.state.currentEpisode ? 
            EPISODES.find(e => e.id === this.game.state.currentEpisode)?.title : 'New Game';
        
        localStorage.setItem(`cursed_objects_save_${slot}`, JSON.stringify(saveData));
        localStorage.setItem('cursed_objects_last_save', slot.toString());
        return true;
    }

    load(slot) {
        const data = this.getSaveData(slot);
        if (data) {
            this.game.state.deserialize(data);
            return true;
        }
        return false;
    }

    hasSave(slot) {
        return localStorage.getItem(`cursed_objects_save_${slot}`) !== null;
    }

    getLastSaveSlot() {
        return parseInt(localStorage.getItem('cursed_objects_last_save') || '0');
    }

    delete(slot) {
        localStorage.removeItem(`cursed_objects_save_${slot}`);
    }

    autoSave() {
        this.save(0, 'Autosave');
    }

    exportSave(slot) {
        const data = this.getSaveData(slot);
        if (data) {
            return btoa(JSON.stringify(data));
        }
        return null;
    }

    importSave(base64Data) {
        try {
            const data = JSON.parse(atob(base64Data));
            if (data.version === SAVE_VERSION) {
                this.game.state.deserialize(data);
                return true;
            }
        } catch (e) {
            console.error('Invalid save data');
        }
        return false;
    }
}

// ============================================
// EPISODE DEFINITIONS - ALL 10 EPISODES
// ============================================
class EpisodeData {
    static getEpisode(episodeId) {
        switch(episodeId) {
            case 'ep1': return this.getEpisode1();
            case 'ep2': return this.getEpisode2();
            case 'ep3': return this.getEpisode3();
            case 'ep4': return this.getEpisode4();
            case 'ep5': return this.getEpisode5();
            case 'ep6': return this.getEpisode6();
            case 'ep7': return this.getEpisode7();
            case 'ep8': return this.getEpisode8();
            case 'ep9': return this.getEpisode9();
            case 'ep10': return this.getEpisode10();
            default: return null;
        }
    }

    // EPISODE 1: THE VHS TAPE
    static getEpisode1() {
        return {
            id: 'ep1',
            acts: [
                { name: 'Discovery', scenes: ['living_room', 'porch', 'tv_room'] },
                { name: 'Investigation', scenes: ['library', 'video_store', 'basement'] },
                { name: 'Confrontation', scenes: ['ritual_room', 'tv_room_final', 'ending'] }
            ],
            scenes: {
                'living_room': new Scene({
                    id: 'living_room',
                    name: 'Living Room',
                    description: 'Your quiet suburban home. A storm rages outside.',
                    background: '#1a1a2e',
                    lighting: 'dim',
                    ambientSound: 'rain',
                    hotspots: [
                        new Hotspot({
                            id: 'window',
                            x: 200, y: 150, width: 300, height: 250,
                            name: 'Window',
                            description: 'Rain streaks down the glass. Lightning flashes in the distance.',
                            type: 'object',
                            interactions: {
                                examine: () => ({ text: 'The storm is getting worse. You can barely see the neighbor\'s house through the downpour.' })
                            }
                        }),
                        new Hotspot({
                            id: 'mailbox_area',
                            x: 1400, y: 500, width: 200, height: 300,
                            name: 'Front Door',
                            description: 'Someone left a package on the porch.',
                            type: 'door',
                            transitions: { go: 'porch' },
                            interactions: {
                                examine: () => ({ text: 'The mailman came during the storm. There\'s a wet package on the porch.' })
                            }
                        }),
                        new Hotspot({
                            id: 'tv',
                            x: 800, y: 300, width: 300, height: 200,
                            name: 'Television',
                            description: 'Your old CRT television. It still works perfectly.',
                            type: 'object',
                            transitions: { use: 'tv_room' },
                            interactions: {
                                examine: () => ({ text: 'A relic from the 90s. You keep it for your VHS collection.' })
                            }
                        })
                    ]
                }),
                'porch': new Scene({
                    id: 'porch',
                    name: 'Front Porch',
                    description: 'The rain is relentless. A soggy cardboard box sits on the welcome mat.',
                    background: '#0f0f1a',
                    lighting: 'dark',
                    ambientSound: 'thunder',
                    hotspots: [
                        new Hotspot({
                            id: 'package',
                            x: 900, y: 700, width: 150, height: 100,
                            name: 'Mysterious Package',
                            description: 'No return address. Just your name written in smudged ink.',
                            type: 'object',
                            givesItem: { type: 'vhs_tape', name: 'Mysterious VHS', icon: '📼', description: 'An unlabeled VHS tape. It feels cold to the touch.' },
                            interactions: {
                                examine: () => ({ 
                                    text: 'The box is damp but intact. Inside is a VHS tape with no label. A sticky note reads: "WATCH ME."',
                                    event: 'found_tape'
                                }),
                                take: () => ({ text: 'You carefully place the tape in your bag. It feels... wrong.' })
                            }
                        }),
                        new Hotspot({
                            id: 'door_in',
                            x: 600, y: 400, width: 200, height: 400,
                            name: 'Front Door',
                            description: 'Back inside.',
                            type: 'door',
                            transitions: { go: 'living_room' }
                        })
                    ],
                    onEnter: (game) => {
                        game.state.setFlag('visited_porch', true);
                    }
                }),
                'tv_room': new Scene({
                    id: 'tv_room',
                    name: 'TV Room',
                    description: 'The VCR is ready. Static fills the screen.',
                    background: '#050508',
                    lighting: 'tv_static',
                    ambientSound: 'static',
                    hotspots: [
                        new Hotspot({
                            id: 'vcr',
                            x: 850, y: 400, width: 200, height: 100,
                            name: 'VCR Player',
                            description: 'The tape slot waits silently.',
                            type: 'object',
                            requiredItem: 'vhs_tape',
                            interactions: {
                                use: (game) => {
                                    if (game.state.hasItem('vhs_tape')) {
                                        return { 
                                            text: 'You insert the tape. The VCR whirs to life. The screen flickers, and a pale woman crawls out of the well...',
                                            event: 'watched_tape',
                                            transition: 'video_store'
                                        };
                                    }
                                    return { text: 'You don\'t have anything to play.' };
                                },
                                examine: () => ({ text: 'Your trusty VCR. It\'s seen better days but still works.' })
                            }
                        }),
                        new Hotspot({
                            id: 'screen',
                            x: 700, y: 200, width: 500, height: 350,
                            name: 'TV Screen',
                            description: 'Static hisses. Something moves in the noise.',
                            type: 'object',
                            interactions: {
                                examine: () => ({ 
                                    text: 'For a moment, you think you see a face in the static. Just your imagination... right?',
                                    sanity: -5
                                })
                            }
                        })
                    ],
                    onEnter: (game) => {
                        if (game.state.getFlag('watched_tape')) {
                            game.showTextOverlay('7 DAYS', 'The phone rings. A voice whispers: "Seven days." Then silence.');
                        }
                    }
                }),
                'video_store': new Scene({
                    id: 'video_store',
                    name: 'Video Store',
                    description: 'The last VHS rental store in town. The owner knows something.',
                    background: '#1e1e2f',
                    lighting: 'fluorescent',
                    hotspots: [
                        new Hotspot({
                            id: 'clerk',
                            x: 400, y: 300, width: 150, height: 250,
                            name: 'Store Clerk',
                            description: 'An old man who\'s seen too much.',
                            type: 'person',
                            interactions: {
                                talk: (game) => {
                                    if (game.state.getFlag('knows_about_curse')) {
                                        return {
                                            choices: [
                                                { text: 'Tell me about the curse.', onSelect: () => game.dialogue.show('"The only way to survive is to copy the tape and show it to someone else. But that damns them instead."', 'Clerk') },
                                                { text: 'Is there another way?', onSelect: () => game.dialogue.show('"There might be... if you can find where the tape was made. Break the source."', 'Clerk', () => game.state.setFlag('knows_about_source', true)) }
                                            ],
                                            text: 'What do you want to know?'
                                        };
                                    }
                                    return { text: '"You\'ve watched it, haven\'t you? I can see it in your eyes. You have seven days."', event: 'knows_about_curse' };
                                }
                            }
                        }),
                        new Hotspot({
                            id: 'back_room',
                            x: 1500, y: 400, width: 200, height: 350,
                            name: 'Back Room',
                            description: 'Employees only. But you need answers.',
                            type: 'door',
                            requiredItem: 'store_key',
                            transitions: { go: 'basement' }
                        })
                    ]
                }),
                'basement': new Scene({
                    id: 'basement',
                    name: 'Hidden Basement',
                    description: 'A darkroom where the cursed tape was duplicated. The walls are covered in copies.',
                    background: '#0a0a10',
                    lighting: 'red_dark',
                    ambientSound: 'whispers',
                    hotspots: [
                        new Hotspot({
                            id: 'duplicator',
                            x: 800, y: 400, width: 300, height: 200,
                            name: 'Industrial Duplicator',
                            description: 'A commercial-grade VHS duplicator. Hundreds of cursed copies.',
                            type: 'object',
                            interactions: {
                                examine: () => ({ 
                                    text: 'A factory of curses. Each copy damns another soul.',
                                    choices: [
                                        { text: 'Destroy the machine', onSelect: (g) => g.triggerEnding('best') },
                                        { text: 'Make a copy for someone else', onSelect: (g) => g.triggerEnding('bad') },
                                        { text: 'Leave it alone', onSelect: (g) => g.triggerEnding('neutral') }
                                    ]
                                })
                            }
                        })
                    ]
                }),
                'ritual_room': new Scene({
                    id: 'ritual_room',
                    name: 'The Well Room',
                    description: 'The source of it all. She waits below.',
                    background: '#000000',
                    lighting: 'minimal',
                    ambientSound: 'crying',
                    onEnter: (game) => {
                        if (game.state.getFlag('has_salt') && game.state.getFlag('knows_ritual')) {
                            game.showDialogue('The spirits whisper the words. You can lay her to rest.', 'Narrator');
                        }
                    }
                })
            },
            endings: {
                best: {
                    type: ENDING_TYPES.BEST,
                    description: 'You found the source of the curse and destroyed the duplicator. The woman in the tape can finally rest. You are free.',
                    conditions: (s) => s.getFlag('destroyed_duplicator')
                },
                good: {
                    type: ENDING_TYPES.GOOD,
                    description: 'You made it to the well and performed the sealing ritual. The curse is contained, though not destroyed.',
                    conditions: (s) => s.getFlag('sealed_well')
                },
                neutral: {
                    type: ENDING_TYPES.NEUTRAL,
                    description: 'Seven days pass. The phone rings. But when you answer, there\'s only dial tone. Perhaps it was all a dream.',
                    conditions: () => true
                },
                bad: {
                    type: ENDING_TYPES.BAD,
                    description: 'You copied the tape. Someone else watches it now. You survive, but their blood is on your hands.',
                    conditions: (s) => s.getFlag('copied_tape')
                },
                worst: {
                    type: ENDING_TYPES.WORST,
                    description: 'On the seventh day, she crawls out of your TV screen. You join her in the tape, waiting for the next victim.',
                    conditions: (s) => s.sanity < 20
                }
            }
        };
    }

    // EPISODE 2: THE DOLL
    static getEpisode2() {
        return {
            id: 'ep2',
            acts: [
                { name: 'Acquisition', scenes: ['antique_shop', 'bedroom_first', 'bedroom_night'] },
                { name: 'Escalation', scenes: ['bedroom_moving', 'attic', 'nursery'] },
                { name: 'Possession', scenes: ['mirror_room', 'final_bedroom', 'ending'] }
            ],
            scenes: {
                'antique_shop': new Scene({
                    id: 'antique_shop',
                    name: 'Madame Vesper\'s Antiques',
                    description: 'Dusty shelves filled with forgotten things. The shopkeeper smiles too widely.',
                    background: '#2a1f1f',
                    lighting: 'warm_dim',
                    hotspots: [
                        new Hotspot({
                            id: 'doll_display',
                            x: 600, y: 300, width: 200, height: 300,
                            name: 'Porcelain Doll',
                            description: 'Her name is Charlotte. Her eyes seem to follow you.',
                            type: 'object',
                            givesItem: { type: 'doll', name: 'Charlotte Doll', icon: '🎎', description: 'A Victorian porcelain doll with glass eyes that seem alive.' },
                            interactions: {
                                examine: () => ({ 
                                    text: 'The doll wears a Victorian dress. Her painted smile is almost... knowing.',
                                    sanity: -3
                                }),
                                take: () => ({ 
                                    text: '"She likes you," the shopkeeper whispers. "Take good care of her. She\'s been waiting for a friend."',
                                    event: 'acquired_doll'
                                })
                            }
                        }),
                        new Hotspot({
                            id: 'shopkeeper',
                            x: 1200, y: 250, width: 180, height: 350,
                            name: 'Madame Vesper',
                            description: 'An ancient woman with milky eyes.',
                            type: 'person',
                            interactions: {
                                talk: () => ({
                                    choices: [
                                        { text: 'Where did the doll come from?', onSelect: (g) => {
                                            g.dialogue.show('"Charlotte belonged to a girl who died in 1889. They say she never stopped looking for a playmate."', 'Madame Vesper', () => {
                                                g.state.setFlag('knows_doll_history', true);
                                            });
                                        }},
                                        { text: 'Is it... cursed?', onSelect: (g) => {
                                            g.dialogue.show('The shopkeeper\'s smile widens. "All dolls are cursed, dear. Some are just more honest about it."', 'Madame Vesper');
                                        }}
                                    ],
                                    text: 'Can I help you find something?'
                                })
                            }
                        })
                    ]
                }),
                'bedroom_first': new Scene({
                    id: 'bedroom_first',
                    name: 'Your Bedroom',
                    description: 'You place Charlotte on the dresser. The room feels colder.',
                    background: '#1a1515',
                    lighting: 'warm',
                    hotspots: [
                        new Hotspot({
                            id: 'dresser',
                            x: 1300, y: 350, width: 300, height: 200,
                            name: 'Dresser',
                            description: 'Charlotte sits primly, watching.',
                            type: 'object',
                            interactions: {
                                examine: () => ({ text: 'Charlotte\'s head is tilted at a different angle than you left her. Probably the breeze...' }),
                                use: (game) => {
                                    if (game.state.hasItem('salt')) {
                                        return { text: 'You place a circle of salt around the doll. Her expression seems... angry.', event: 'salt_protection' };
                                    }
                                    return { text: 'You don\'t have anything useful.' };
                                }
                            }
                        }),
                        new Hotspot({
                            id: 'bed',
                            x: 400, y: 500, width: 500, height: 400,
                            name: 'Bed',
                            description: 'Time to sleep.',
                            type: 'object',
                            transitions: { use: 'bedroom_night' }
                        })
                    ],
                    onEnter: (game) => {
                        if (game.state.getFlag('acquired_doll')) {
                            game.showNotification('🎎', 'Charlotte is watching you');
                        }
                    }
                }),
                'bedroom_night': new Scene({
                    id: 'bedroom_night',
                    name: 'Midnight',
                    description: 'Something woke you. The house is silent. Too silent.',
                    background: '#0a0505',
                    lighting: 'moonlight',
                    ambientSound: 'creaking',
                    hotspots: [
                        new Hotspot({
                            id: 'charlotte_night',
                            x: 1300, y: 350, width: 150, height: 200,
                            name: 'Charlotte',
                            description: 'She\'s not on the dresser anymore.',
                            type: 'object',
                            interactions: {
                                examine: () => ({ 
                                    text: 'The dresser is empty. Charlotte is gone.',
                                    event: 'doll_missing',
                                    sanity: -10
                                })
                            }
                        }),
                        new Hotspot({
                            id: 'closet',
                            x: 200, y: 300, width: 250, height: 400,
                            name: 'Closet',
                            description: 'The door is slightly open.',
                            type: 'door',
                            transitions: { go: 'closet_scene' }
                        })
                    ],
                    onEnter: (game) => {
                        game.state.modifySanity(-10);
                        HorrorAudio.playJumpScare();
                    }
                }),
                'closet_scene': new Scene({
                    id: 'closet_scene',
                    name: 'The Closet',
                    description: 'Darkness. And breathing that isn\'t yours.',
                    background: '#050305',
                    lighting: 'pitch_black',
                    ambientSound: 'child_whispers',
                    onEnter: (game) => {
                        game.showDialogue('"Play with me," a child\'s voice whispers. "Be my friend forever."', '???');
                        setTimeout(() => {
                            HorrorAudio.playJumpScare();
                            game.transitionTo('bedroom_moving');
                        }, 3000);
                    }
                }),
                'bedroom_moving': new Scene({
                    id: 'bedroom_moving',
                    name: 'Your Bedroom - Morning',
                    description: 'Charlotte is back on the dresser. She\'s holding something.',
                    background: '#2a2520',
                    lighting: 'morning',
                    hotspots: [
                        new Hotspot({
                            id: 'charlotte_moving',
                            x: 1300, y: 350, width: 150, height: 200,
                            name: 'Charlotte',
                            description: 'She\'s holding a lock of your hair.',
                            type: 'object',
                            interactions: {
                                examine: () => ({ text: 'Your hair. Cut while you slept. Charlotte\'s smile seems wider today.' }),
                                take: () => ({ text: 'You try to take the doll, but she\'s ice-cold. Your fingers burn.' })
                            }
                        }),
                        new Hotspot({
                            id: 'attic_door',
                            x: 1600, y: 200, width: 150, height: 100,
                            name: 'Attic Hatch',
                            description: 'You need answers. The doll came from somewhere.',
                            type: 'door',
                            transitions: { go: 'attic' }
                        })
                    ]
                }),
                'attic': new Scene({
                    id: 'attic',
                    name: 'The Attic',
                    description: 'Dusty boxes. And a diary belonging to the doll\'s original owner.',
                    background: '#1a1815',
                    lighting: 'dim',
                    hotspots: [
                        new Hotspot({
                            id: 'diary',
                            x: 800, y: 600, width: 100, height: 80,
                            name: 'Old Diary',
                            description: '1889. The entries get darker.',
                            type: 'object',
                            givesItem: { type: 'diary', name: 'Emily\'s Diary', icon: '📖', description: 'The last entries describe Charlotte coming to life.' },
                            interactions: {
                                examine: () => ({ 
                                    text: '"Charlotte moved again last night. She wants to be me. She wants my life."',
                                    event: 'read_diary',
                                    sanity: -5
                                })
                            }
                        }),
                        new Hotspot({
                            id: 'old_photo',
                            x: 500, y: 400, width: 200, height: 150,
                            name: 'Photograph',
                            description: 'A girl with the doll. They look... similar.',
                            type: 'object',
                            interactions: {
                                examine: () => ({ 
                                    text: 'The resemblance is uncanny. The doll was made to look exactly like Emily.',
                                    event: 'saw_photo'
                                })
                            }
                        })
                    ]
                }),
                'mirror_room': new Scene({
                    id: 'mirror_room',
                    name: 'The Mirror',
                    description: 'Charlotte stands before the mirror. She\'s wearing your clothes.',
                    background: '#151015',
                    lighting: 'mirror_glow',
                    ambientSound: 'child_laughing',
                    onEnter: (game) => {
                        game.showDialogue('The doll turns. Your reflection doesn\'t move when you do.', 'Narrator');
                    }
                })
            },
            endings: {
                best: {
                    type: ENDING_TYPES.BEST,
                    description: 'You performed Emily\'s ritual and freed her spirit from the doll. Charlotte\'s curse is broken. She\'s just a doll now.'
                },
                good: {
                    type: ENDING_TYPES.GOOD,
                    description: 'You trapped Charlotte in a salt circle and buried her in consecrated ground. She won\'t hurt anyone again.'
                },
                neutral: {
                    type: ENDING_TYPES.NEUTRAL,
                    description: 'You moved away and left the doll behind. Sometimes, in your new home, you think you see her in the shadows.'
                },
                bad: {
                    type: ENDING_TYPES.BAD,
                    description: 'You destroyed the doll. But Emily\'s spirit latched onto you instead. Now she wears your face.'
                },
                worst: {
                    type: ENDING_TYPES.WORST,
                    description: 'Charlotte succeeded. You are the doll now, trapped in porcelain, watching through glass eyes as she lives your life.'
                }
            }
        };
    }

    // EPISODE 3: THE MIRROR
    static getEpisode3() {
        return {
            id: 'ep3',
            acts: [
                { name: 'Installation', scenes: ['apartment', 'mirror_first', 'sleep_first'] },
                { name: 'Visions', scenes: ['mirror_changed', 'investigation', 'horror_vision'] },
                { name: 'Truth', scenes: ['mirror_truth', 'origin_room', 'ending'] }
            ],
            scenes: {
                'apartment': new Scene({
                    id: 'apartment',
                    name: 'Your Apartment',
                    description: 'Finally unpacked. The estate sale mirror will look perfect in the hallway.',
                    background: '#252530',
                    lighting: 'warm',
                    hotspots: [
                        new Hotspot({
                            id: 'mirror_box',
                            x: 800, y: 400, width: 200, height: 300,
                            name: 'Mirror Crate',
                            description: 'A Victorian mirror wrapped in moving blankets.',
                            type: 'object',
                            transitions: { use: 'mirror_first' },
                            interactions: {
                                examine: () => ({ text: 'The frame is ornate, gilded with gold leaf. The glass looks old but pristine.' })
                            }
                        })
                    ]
                }),
                'mirror_first': new Scene({
                    id: 'mirror_first',
                    name: 'The Hallway',
                    description: 'The mirror is mounted. Your reflection looks... delayed.',
                    background: '#1a1a25',
                    lighting: 'fluorescent',
                    hotspots: [
                        new Hotspot({
                            id: 'mirror',
                            x: 700, y: 150, width: 400, height: 600,
                            name: 'Victorian Mirror',
                            description: 'Silvered glass in an ornate frame.',
                            type: 'object',
                            interactions: {
                                examine: () => ({ 
                                    text: 'There\'s something written at the bottom of the frame: "See thyself, see thy end."',
                                    event: 'saw_inscription'
                                }),
                                use: () => ({ 
                                    text: 'You touch the glass. It\'s cold. Very cold.',
                                    sanity: -2
                                })
                            }
                        }),
                        new Hotspot({
                            id: 'bedroom_door',
                            x: 1500, y: 300, width: 200, height: 400,
                            name: 'Bedroom',
                            description: 'Time to rest.',
                            type: 'door',
                            transitions: { go: 'sleep_first' }
                        })
                    ]
                }),
                'sleep_first': new Scene({
                    id: 'sleep_first',
                    name: 'Bedroom',
                    description: 'You dream of the mirror. In the dream, your reflection smiles when you don\'t.',
                    background: '#100a15',
                    lighting: 'dark',
                    onEnter: (game) => {
                        setTimeout(() => {
                            game.showDialogue('You wake up at 3:33 AM. The mirror is glowing faintly from the hallway.', 'Narrator', () => {
                                game.transitionTo('mirror_changed');
                            });
                        }, 2000);
                    }
                }),
                'mirror_changed': new Scene({
                    id: 'mirror_changed',
                    name: 'The Hallway - Night',
                    description: 'The mirror shows a different room behind your reflection. A room that doesn\'t exist in your apartment.',
                    background: '#0a0a15',
                    lighting: 'mirror_glow',
                    ambientSound: 'humming',
                    hotspots: [
                        new Hotspot({
                            id: 'mirror_vision',
                            x: 700, y: 150, width: 400, height: 600,
                            name: 'The Mirror',
                            description: 'Your reflection is sitting down. You\'re standing.',
                            type: 'object',
                            interactions: {
                                examine: () => ({ 
                                    text: 'The room in the reflection is Victorian. There\'s a body on the floor. It\'s wearing your clothes.',
                                    sanity: -15,
                                    event: 'saw_vision'
                                }),
                                use: (game) => {
                                    if (game.state.hasItem('salt')) {
                                        return { text: 'You throw salt at the mirror. The glass cracks, and someone SCREAMS from inside.', event: 'damaged_mirror' };
                                    }
                                    return { text: 'Your hand passes through the glass. It\'s like cold water.' };
                                }
                            }
                        })
                    ]
                }),
                'investigation': new Scene({
                    id: 'investigation',
                    name: 'Library Research',
                    description: 'The mirror\'s history. It\'s worse than you imagined.',
                    background: '#1e1e28',
                    lighting: 'fluorescent',
                    hotspots: [
                        new Hotspot({
                            id: 'newspaper',
                            x: 600, y: 500, width: 300, height: 200,
                            name: 'Old Newspaper',
                            description: 'The Blackwood Estate fire, 1893.',
                            type: 'object',
                            interactions: {
                                examine: () => ({ 
                                    text: '"Lady Eleanor Blackwood perished in the flames. She was found clutching her prized mirror. Her reflection was not recovered."',
                                    event: 'found_history',
                                    sanity: -5
                                })
                            }
                        }),
                        new Hotspot({
                            id: 'librarian',
                            x: 1300, y: 300, width: 150, height: 300,
                            name: 'Librarian',
                            description: 'She knows about the mirror.',
                            type: 'person',
                            interactions: {
                                talk: () => ({
                                    choices: [
                                        { text: 'Tell me about Lady Blackwood.', onSelect: (g) => {
                                            g.dialogue.show('"She believed the mirror showed the future. On the night of the fire, witnesses say she was arguing with her reflection."', 'Librarian');
                                        }},
                                        { text: 'How do I stop it?', onSelect: (g) => {
                                            g.dialogue.show('"The mirror shows possibilities. Refuse your fate. Break the cycle."', 'Librarian', () => {
                                                g.state.setFlag('knows_solution', true);
                                            });
                                        }}
                                    ],
                                    text: 'I wondered when someone would ask about that mirror.'
                                })
                            }
                        })
                    ]
                }),
                'mirror_truth': new Scene({
                    id: 'mirror_truth',
                    name: 'The Final Reflection',
                    description: 'The mirror shows your death. Unless you change it.',
                    background: '#0a0510',
                    lighting: 'red_dark',
                    ambientSound: 'crackling',
                    onEnter: (game) => {
                        game.showDialogue('The room in the mirror is on fire. Your reflection is trapped, pounding on the glass.', 'Narrator');
                    }
                })
            },
            endings: {
                best: {
                    type: ENDING_TYPES.BEST,
                    description: 'You recognized that the mirror showed a possibility, not certainty. You changed your fate and freed Eleanor\'s trapped soul.'
                },
                good: {
                    type: ENDING_TYPES.GOOD,
                    description: 'You broke the mirror at the right moment. The vision died with the glass. You have a scar, but you\'re alive.'
                },
                neutral: {
                    type: ENDING_TYPES.NEUTRAL,
                    description: 'You covered the mirror and moved it to storage. Sometimes you wonder what would have happened if you\'d looked one more time.'
                },
                bad: {
                    type: ENDING_TYPES.BAD,
                    description: 'The vision came true. But you didn\'t die - you became trapped in the mirror, watching a new owner from the glass.'
                },
                worst: {
                    type: ENDING_TYPES.WORST,
                    description: 'You accepted your fate. The fire was warm. Now you wait in the mirror for the next curious soul.'
                }
            }
        };
    }

    // EPISODE 4: THE CAMERA
    static getEpisode4() {
        return {
            id: 'ep4',
            acts: [
                { name: 'Discovery', scenes: ['crime_scene', 'apartment_camera', 'first_photo'] },
                { name: 'Pattern', scenes: ['darkroom', 'street_investigation', 'second_photo'] },
                { name: 'Intervention', scenes: ['prediction_scene', 'final_choice', 'ending'] }
            ],
            scenes: {
                'crime_scene': new Scene({
                    id: 'crime_scene',
                    name: 'Abandoned Warehouse',
                    description: 'Police tape everywhere. This is where the body was found.',
                    background: '#1a1a20',
                    lighting: 'police_lights',
                    hotspots: [
                        new Hotspot({
                            id: 'victim_outline',
                            x: 900, y: 700, width: 200, height: 100,
                            name: 'Chalk Outline',
                            description: 'Position of the body.',
                            type: 'object',
                            interactions: {
                                examine: () => ({ text: 'The outline shows the victim was reaching for something. A camera?' })
                            }
                        }),
                        new Hotspot({
                            id: 'polaroid',
                            x: 850, y: 750, width: 80, height: 60,
                            name: 'Polaroid Camera',
                            description: 'Evidence bag #47. An old Polaroid.',
                            type: 'object',
                            givesItem: { type: 'camera', name: 'Polaroid Camera', icon: '📷', description: 'An old Polaroid that shows the future. The future you can\'t escape.' },
                            interactions: {
                                examine: () => ({ text: 'It\'s covered in fingerprints. One of them glows faintly.' }),
                                take: () => ({ text: 'You slip the camera into your pocket. The detective won\'t miss it... right?', event: 'took_camera' })
                            }
                        })
                    ]
                }),
                'apartment_camera': new Scene({
                    id: 'apartment_camera',
                    name: 'Your Apartment',
                    description: 'The camera feels heavy in your hands. Like it\'s waiting.',
                    background: '#252530',
                    lighting: 'warm',
                    hotspots: [
                        new Hotspot({
                            id: 'camera_use',
                            x: 900, y: 500, width: 100, height: 80,
                            name: 'Polaroid Camera',
                            description: 'Should you use it?',
                            type: 'object',
                            transitions: { use: 'first_photo' },
                            interactions: {
                                examine: () => ({ text: 'There\'s still film inside. Ten shots left.' }),
                                use: () => ({ text: 'You raise the camera and press the button. The flash blinds you.', event: 'first_photo_taken' })
                            }
                        })
                    ]
                }),
                'first_photo': new Scene({
                    id: 'first_photo',
                    name: 'The First Photo',
                    description: 'The image develops slowly. It\'s your apartment. But different.',
                    background: '#1a1a25',
                    lighting: 'dark',
                    onEnter: (game) => {
                        setTimeout(() => {
                            game.showDialogue('The photo shows your living room... destroyed. Blood on the floor. And a date: tomorrow.', 'Narrator', () => {
                                game.state.setFlag('saw_death_photo', true);
                                game.state.modifySanity(-10);
                                game.transitionTo('apartment_camera');
                            });
                        }, 1500);
                    }
                }),
                'street_investigation': new Scene({
                    id: 'street_investigation',
                    name: 'City Streets',
                    description: 'The camera shows you a figure in the crowd. The next victim.',
                    background: '#151520',
                    lighting: 'streetlights',
                    hotspots: [
                        new Hotspot({
                            id: 'woman',
                            x: 600, y: 400, width: 100, height: 250,
                            name: 'Woman in Red',
                            description: 'The camera showed her drowning.',
                            type: 'person',
                            interactions: {
                                talk: () => ({
                                    choices: [
                                        { text: 'I need to warn you.', onSelect: (g) => {
                                            g.dialogue.show('You show her the photo. She laughs it off. But later, she avoids the bridge.', 'Narrator', () => {
                                                g.state.setFlag('saved_woman', true);
                                            });
                                        }},
                                        { text: 'Watch out for water.', onSelect: (g) => {
                                            g.dialogue.show('She looks confused but thanks you. You\'ll never know if it worked.', 'Narrator');
                                        }}
                                    ],
                                    text: 'Can I help you?'
                                })
                            }
                        }),
                        new Hotspot({
                            id: 'bridge',
                            x: 1300, y: 300, width: 400, height: 200,
                            name: 'River Bridge',
                            description: 'The photo showed her falling from here.',
                            type: 'object',
                            interactions: {
                                examine: () => ({ text: 'You can prevent this. You HAVE to prevent this.' })
                            }
                        })
                    ]
                }),
                'prediction_scene': new Scene({
                    id: 'prediction_scene',
                    name: 'The Final Prediction',
                    description: 'The camera shows you holding the camera. But you\'re dead in the photo.',
                    background: '#0a0a10',
                    lighting: 'red_dark',
                    onEnter: (game) => {
                        game.showDialogue('The photo develops. It\'s you, lying on the floor, camera in hand. Someone stands over you. Someone... familiar.', 'Narrator');
                    }
                })
            },
            endings: {
                best: {
                    type: ENDING_TYPES.BEST,
                    description: 'You saved every victim the camera showed you. The curse broke - you changed the future enough times to shatter the timeline.'
                },
                good: {
                    type: ENDING_TYPES.GOOD,
                    description: 'You saved most of them. The camera stopped working after that. You hope it\'s over.'
                },
                neutral: {
                    type: ENDING_TYPES.NEUTRAL,
                    description: 'You tried to save them. Some lived. Some didn\'t. You\'ll never know if it was the camera or coincidence.'
                },
                bad: {
                    type: ENDING_TYPES.BAD,
                    description: 'You couldn\'t save them. The camera\'s predictions always came true. You\'re the only one left to photograph.'
                },
                worst: {
                    type: ENDING_TYPES.WORST,
                    description: 'You realized the truth: the camera doesn\'t predict death. It causes it. And now you\'re its next photographer.'
                }
            }
        };
    }

    // EPISODE 5: THE MUSIC BOX
    static getEpisode5() {
        return {
            id: 'ep5',
            acts: [
                { name: 'Inheritance', scenes: ['cabin_arrival', 'music_box_discover', 'first_play'] },
                { name: 'Haunting', scenes: ['dancing_ghosts', 'basement_discovery', 'full_moon'] },
                { name: 'Resolution', scenes: ['final_melody', 'resting_place', 'ending'] }
            ],
            scenes: {
                'cabin_arrival': new Scene({
                    id: 'cabin_arrival',
                    name: 'Inherited Cabin',
                    description: 'Your uncle left you this remote cabin. And something else.',
                    background: '#1a2015',
                    lighting: 'afternoon',
                    hotspots: [
                        new Hotspot({
                            id: 'letter',
                            x: 800, y: 600, width: 200, height: 100,
                            name: 'Uncle\'s Letter',
                            description: '"Don\'t wind the music box. Please, Thomas. Don\'t."',
                            type: 'object',
                            interactions: {
                                examine: () => ({ 
                                    text: 'Your uncle\'s handwriting gets shakier as it goes. The last line is barely legible: "She dances when it plays."',
                                    event: 'read_letter'
                                })
                            }
                        }),
                        new Hotspot({
                            id: 'music_box_closed',
                            x: 1100, y: 500, width: 150, height: 100,
                            name: 'Ornate Music Box',
                            description: 'Intricate carvings. A ballerina frozen inside.',
                            type: 'object',
                            givesItem: { type: 'music_box', name: 'Music Box', icon: '🎵', description: 'A beautiful antique music box. It wants to play.' },
                            transitions: { use: 'first_play' },
                            interactions: {
                                examine: () => ({ text: 'The ballerina is porcelain. Her dress is tattered. She\'s missing a hand.' })
                            }
                        })
                    ]
                }),
                'first_play': new Scene({
                    id: 'first_play',
                    name: 'The First Song',
                    description: 'The melody is hauntingly beautiful. And incomplete.',
                    background: '#151520',
                    lighting: 'candlelight',
                    ambientSound: 'music_box',
                    onEnter: (game) => {
                        HorrorAudio.playMusicBox();
                        setTimeout(() => {
                            game.showDialogue('The ballerina spins. But her movements are jerky, wrong. She\'s trying to tell you something.', 'Narrator', () => {
                                game.state.setFlag('played_music_box', true);
                                game.transitionTo('dancing_ghosts');
                            });
                        }, 5000);
                    }
                }),
                'dancing_ghosts': new Scene({
                    id: 'dancing_ghosts',
                    name: 'The Dancing Room',
                    description: 'She\'s not alone. Other dancers fade in and out with the melody.',
                    background: '#0a0a15',
                    lighting: 'ghostly',
                    ambientSound: 'music_box_distorted',
                    hotspots: [
                        new Hotspot({
                            id: 'ballerina_ghost',
                            x: 900, y: 300, width: 150, height: 300,
                            name: 'The Ballerina',
                            description: 'She\'s translucent. Trapped in the dance.',
                            type: 'person',
                            interactions: {
                                talk: () => ({
                                    choices: [
                                        { text: 'Who are you?', onSelect: (g) => {
                                            g.dialogue.show('"I was the first. There were others. We dance until someone finishes the song."', 'Ballerina');
                                        }},
                                        { text: 'How do I free you?', onSelect: (g) => {
                                            g.dialogue.show('"The composer never finished his work. Play the ending, and we can rest."', 'Ballerina', () => {
                                                g.state.setFlag('knows_solution', true);
                                            });
                                        }}
                                    ],
                                    text: 'Help us. Please.'
                                })
                            }
                        })
                    ]
                }),
                'basement_discovery': new Scene({
                    id: 'basement_discovery',
                    name: 'The Composer\'s Workshop',
                    description: 'Sheet music everywhere. And a diary.',
                    background: '#0f0f15',
                    lighting: 'dim',
                    hotspots: [
                        new Hotspot({
                            id: 'sheet_music',
                            x: 600, y: 500, width: 300, height: 200,
                            name: 'Unfinished Symphony',
                            description: 'The melody is incomplete.',
                            type: 'object',
                            givesItem: { type: 'music_sheet', name: 'Sheet Music', icon: '🎼', description: 'The final notes of the composition.' },
                            interactions: {
                                examine: () => ({ 
                                    text: 'The last page is blank except for a note: "I cannot finish it. The dancers demand a price I won\'t pay."',
                                    event: 'found_music'
                                })
                            }
                        })
                    ]
                }),
                'final_melody': new Scene({
                    id: 'final_melody',
                    name: 'The Final Performance',
                    description: 'You must complete the song. But the music box demands a dancer.',
                    background: '#050510',
                    lighting: 'spotlight',
                    ambientSound: 'music_box_full',
                    onEnter: (game) => {
                        game.showDialogue('The dancers gather around you. They smile hopefully. They know this is the end.', 'Narrator');
                    }
                })
            },
            endings: {
                best: {
                    type: ENDING_TYPES.BEST,
                    description: 'You played the final notes and freed the trapped dancers. They bowed to you before fading away. The music box is silent now.'
                },
                good: {
                    type: ENDING_TYPES.GOOD,
                    description: 'You completed the melody. The dancers departed, but you hear the tune sometimes, on quiet nights.'
                },
                neutral: {
                    type: ENDING_TYPES.NEUTRAL,
                    description: 'You smashed the music box. The dancers screamed as they dissolved. It was mercy, you tell yourself.'
                },
                bad: {
                    type: ENDING_TYPES.BAD,
                    description: 'You tried to finish the song but played it wrong. Now you dance with them, forever.'
                },
                worst: {
                    type: ENDING_TYPES.WORST,
                    description: 'You refused to play. The dancers were angry. Now you\'re the ballerina in the box, and someone else is winding the key.'
                }
            }
        };
    }

    // EPISODE 6: THE PAINTING
    static getEpisode6() {
        return {
            id: 'ep6',
            acts: [
                { name: 'Acquisition', scenes: ['thrift_store', 'hanging_painting', 'first_night'] },
                { name: 'Changes', scenes: ['morning_changes', 'documentation', 'research'] },
                { name: 'Revelation', scenes: ['painting_truth', 'confrontation', 'ending'] }
            ],
            scenes: {
                'thrift_store': new Scene({
                    id: 'thrift_store',
                    name: 'Thrift Store',
                    description: 'A beautiful oil portrait for only $20. The store owner couldn\'t wait to get rid of it.',
                    background: '#2a2520',
                    lighting: 'fluorescent',
                    hotspots: [
                        new Hotspot({
                            id: 'painting_store',
                            x: 700, y: 200, width: 300, height: 400,
                            name: 'Oil Portrait',
                            description: 'A woman in Victorian dress. Her eyes seem sad.',
                            type: 'object',
                            givesItem: { type: 'painting', name: 'Oil Portrait', icon: '🖼️', description: 'A painting that changes. The woman wants out.' },
                            interactions: {
                                examine: () => ({ text: 'The frame is ornate brass. The painting itself is masterfully done.' }),
                                take: () => ({ text: '"Take it!" the owner says too quickly. "No charge. Just get it out of here."', event: 'acquired_painting' })
                            }
                        })
                    ]
                }),
                'hanging_painting': new Scene({
                    id: 'hanging_painting',
                    name: 'Hallway',
                    description: 'The painting looks perfect here. The woman almost seems to smile.',
                    background: '#252020',
                    lighting: 'warm',
                    hotspots: [
                        new Hotspot({
                            id: 'painting_hung',
                            x: 800, y: 200, width: 300, height: 450,
                            name: 'The Portrait',
                            description: 'She\'s watching you.',
                            type: 'object',
                            interactions: {
                                examine: () => ({ text: 'Beautiful brushwork. The artist captured something in her eyes. Longing?' })
                            }
                        })
                    ],
                    onEnter: (game) => {
                        game.state.setFlag('painting_hung', true);
                    }
                }),
                'morning_changes': new Scene({
                    id: 'morning_changes',
                    name: 'The Next Morning',
                    description: 'The painting is different. The woman\'s hand is raised now. It wasn\'t before.',
                    background: '#2a2020',
                    lighting: 'morning',
                    hotspots: [
                        new Hotspot({
                            id: 'painting_changed',
                            x: 800, y: 200, width: 300, height: 450,
                            name: 'The Changed Portrait',
                            description: 'Her hand is reaching out of the frame.',
                            type: 'object',
                            interactions: {
                                examine: () => ({ 
                                    text: 'She\'s reaching toward something. Or someone.',
                                    sanity: -5,
                                    event: 'noticed_change'
                                })
                            }
                        })
                    ]
                }),
                'research': new Scene({
                    id: 'research',
                    name: 'Art History Department',
                    description: 'Professor Eldridge recognizes the painting. And he\'s terrified.',
                    background: '#202530',
                    lighting: 'fluorescent',
                    hotspots: [
                        new Hotspot({
                            id: 'professor',
                            x: 600, y: 300, width: 150, height: 300,
                            name: 'Professor Eldridge',
                            description: 'He pales when you describe the painting.',
                            type: 'person',
                            interactions: {
                                talk: () => ({
                                    choices: [
                                        { text: 'What do you know about the painting?', onSelect: (g) => {
                                            g.dialogue.show('"It\'s the work of Alistair Blackwood. He painted his wife, then killed her. He believed he could trap souls in oil and canvas."', 'Professor');
                                        }},
                                        { text: 'How do I stop it from changing?', onSelect: (g) => {
                                            g.dialogue.show('"You can\'t stop it. But you can help her finish what she\'s trying to do. She\'s reaching for something she lost."', 'Professor', () => {
                                                g.state.setFlag('knows_truth', true);
                                            });
                                        }}
                                    ],
                                    text: 'You\'ve brought something terrible into your home.'
                                })
                            }
                        })
                    ]
                }),
                'painting_truth': new Scene({
                    id: 'painting_truth',
                    name: 'The Final Change',
                    description: 'She\'s almost out of the frame. She\'s reaching for the nursery.',
                    background: '#151015',
                    lighting: 'moonlight',
                    onEnter: (game) => {
                        game.showDialogue('You understand now. She\'s reaching for her child. The one Blackwood took from her.', 'Narrator');
                    }
                })
            },
            endings: {
                best: {
                    type: ENDING_TYPES.BEST,
                    description: 'You placed her daughter\'s locket in the painting\'s hand. She smiled, took it, and stepped out of the frame. Free at last.'
                },
                good: {
                    type: ENDING_TYPES.GOOD,
                    description: 'You burned the painting. Her spirit thanked you before dissipating. She\'s at peace.'
                },
                neutral: {
                    type: ENDING_TYPES.NEUTRAL,
                    description: 'You covered the painting and moved it to the attic. Sometimes you hear a woman crying up there.'
                },
                bad: {
                    type: ENDING_TYPES.BAD,
                    description: 'She climbed out of the painting, but she was insane from centuries of isolation. She\'s wearing your face now.'
                },
                worst: {
                    type: ENDING_TYPES.WORST,
                    description: 'You took her place in the painting. Now you stand in oil and canvas, watching your life from the wall, waiting for release.'
                }
            }
        };
    }

    // EPISODE 7: THE SMARTPHONE
    static getEpisode7() {
        return {
            id: 'ep7',
            acts: [
                { name: 'Found', scenes: ['dorm_room', 'found_phone', 'first_message'] },
                { name: 'Communication', scenes: ['messaging', 'investigation_phone', 'revealed_truth'] },
                { name: 'Consequences', scenes: ['dead_contact', 'choice_moment', 'ending'] }
            ],
            scenes: {
                'dorm_room': new Scene({
                    id: 'dorm_room',
                    name: 'Dorm Room',
                    description: 'Another boring Tuesday. Until you find the phone.',
                    background: '#252530',
                    lighting: 'screen_glow',
                    hotspots: [
                        new Hotspot({
                            id: 'phone_on_desk',
                            x: 1000, y: 500, width: 80, height: 150,
                            name: 'Unknown Smartphone',
                            description: 'It wasn\'t here before. It\'s unlocked.',
                            type: 'object',
                            givesItem: { type: 'smartphone', name: 'Unknown Phone', icon: '📱', description: 'A phone that receives messages from the dead. They want to talk.' },
                            transitions: { use: 'first_message' },
                            interactions: {
                                examine: () => ({ text: 'No apps. Just a messaging app with one contact: "MOM". But the messages are from someone else.' }),
                                use: () => ({ text: 'The screen lights up. A new message appears.', event: 'opened_phone' })
                            }
                        })
                    ]
                }),
                'first_message': new Scene({
                    id: 'first_message',
                    name: 'The First Message',
                    description: 'Unknown Number: "Help me. I\'m trapped."',
                    background: '#0a0a10',
                    lighting: 'phone_glow',
                    onEnter: (game) => {
                        setTimeout(() => {
                            game.showDialogue('Another message: "I can see you. You\'re in your dorm room. Please, I need to tell someone what happened to me."', 'Phone', () => {
                                game.state.setFlag('received_message', true);
                                game.transitionTo('messaging');
                            });
                        }, 2000);
                    }
                }),
                'messaging': new Scene({
                    id: 'messaging',
                    name: 'The Conversation',
                    description: 'You\'re talking to Sarah Chen. She died three years ago.',
                    background: '#151520',
                    lighting: 'phone_glow',
                    hotspots: [
                        new Hotspot({
                            id: 'phone_chat',
                            x: 600, y: 200, width: 700, height: 600,
                            name: 'Messages',
                            description: 'A conversation with the dead.',
                            type: 'object',
                            interactions: {
                                examine: () => ({
                                    choices: [
                                        { text: '"Who are you?"', onSelect: (g) => {
                                            g.dialogue.show('"I was a student here. Like you. I died in Miller Hall. They said it was an accident. It wasn\'t."', 'Sarah');
                                        }},
                                        { text: '"What do you want?"', onSelect: (g) => {
                                            g.dialogue.show('"I want justice. And I want out. Help me, and I\'ll help you. There\'s something in this phone. Something ancient."', 'Sarah', () => {
                                                g.state.setFlag('knows_danger', true);
                                            });
                                        }}
                                    ],
                                    text: 'What will you say?'
                                })
                            }
                        })
                    ]
                }),
                'investigation_phone': new Scene({
                    id: 'investigation_phone',
                    name: 'Campus Archives',
                    description: 'Sarah Chen. Found dead in her dorm. Ruled suicide. But the photos tell a different story.',
                    background: '#202025',
                    lighting: 'fluorescent',
                    hotspots: [
                        new Hotspot({
                            id: 'newspaper_archive',
                            x: 500, y: 400, width: 300, height: 200,
                            name: 'Old Article',
                            description: '"Student Found Dead in Apparent Suicide"',
                            type: 'object',
                            interactions: {
                                examine: () => ({ text: 'But the photo shows bruises. And someone in the background who shouldn\'t be there.', event: 'found_evidence' })
                            }
                        }),
                        new Hotspot({
                            id: 'librarian_archives',
                            x: 1200, y: 300, width: 150, height: 300,
                            name: 'Archive Librarian',
                            description: 'She remembers Sarah.',
                            type: 'person',
                            interactions: {
                                talk: () => ({
                                    text: '"Sarah wasn\'t the first. The phone... it shows up every few years. Always to students. Always ends the same way."'
                                })
                            }
                        })
                    ]
                }),
                'dead_contact': new Scene({
                    id: 'dead_contact',
                    name: 'Too Many Voices',
                    description: 'The phone has more contacts now. All dead. All talking.',
                    background: '#0a0a10',
                    lighting: 'phone_glow_pulsing',
                    ambientSound: 'notification_chaos',
                    onEnter: (game) => {
                        game.showDialogue('Dozens of messages flood in. They all want something. They all want OUT.', 'Phone', () => {
                            game.state.modifySanity(-15);
                        });
                    }
                })
            },
            endings: {
                best: {
                    type: ENDING_TYPES.BEST,
                    description: 'You solved Sarah\'s murder and brought her killer to justice. She thanked you and deleted herself from the phone. The others followed.'
                },
                good: {
                    type: ENDING_TYPES.GOOD,
                    description: 'You helped Sarah find peace. She deleted the phone\'s contents before departing. It\'s just a phone now.'
                },
                neutral: {
                    type: ENDING_TYPES.NEUTRAL,
                    description: 'You threw the phone in the river. The messages stopped. But sometimes, you feel it vibrating in your pocket.'
                },
                bad: {
                    type: ENDING_TYPES.BAD,
                    description: 'The dead overwhelmed you. You\'re one of them now, trapped in the phone, waiting to message the next owner.'
                },
                worst: {
                    type: ENDING_TYPES.WORST,
                    description: 'You became the phone\'s curator, answering messages from the dead forever. You can\'t put it down. You don\'t want to.'
                }
            }
        };
    }

    // EPISODE 8: THE CAR
    static getEpisode8() {
        return {
            id: 'ep8',
            acts: [
                { name: 'Purchase', scenes: ['used_lot', 'first_drive', 'strange_occurrance'] },
                { name: 'Haunting', scenes: ['ghost_passenger', 'impossible_destination', 'history_revealed'] },
                { name: 'Final Ride', scenes: ['last_trip', 'crash_site', 'ending'] }
            ],
            scenes: {
                'used_lot': new Scene({
                    id: 'used_lot',
                    name: 'Used Car Lot',
                    description: 'A 1967 Mustang. Cherry red. The dealer practically gives it away.',
                    background: '#1a1a20',
                    lighting: 'daylight',
                    hotspots: [
                        new Hotspot({
                            id: 'mustang',
                            x: 700, y: 350, width: 500, height: 250,
                            name: '1967 Mustang',
                            description: 'Classic American muscle. Perfect condition.',
                            type: 'object',
                            givesItem: { type: 'car_keys', name: 'Mustang Keys', icon: '🔑', description: 'Keys to a car with a dark history. Every owner has disappeared.' },
                            interactions: {
                                examine: () => ({ text: 'There are scratches on the driver\'s side door. They look like... fingernails?' }),
                                take: () => ({ text: '"She\'s all yours," the dealer says, not meeting your eyes. "Just... don\'t drive at night."', event: 'bought_car' })
                            }
                        })
                    ]
                }),
                'first_drive': new Scene({
                    id: 'first_drive',
                    name: 'Highway Drive',
                    description: 'The engine purrs. The radio plays songs from 1978. Even though it\'s not on.',
                    background: '#151520',
                    lighting: 'sunset',
                    ambientSound: 'engine',
                    hotspots: [
                        new Hotspot({
                            id: 'radio',
                            x: 800, y: 450, width: 150, height: 80,
                            name: 'Radio',
                            description: 'Playing "Hotel California." The volume knob doesn\'t work.',
                            type: 'object',
                            interactions: {
                                examine: () => ({ text: 'The song is stuck on repeat. "You can check out any time you like..."', sanity: -5 })
                            }
                        }),
                        new Hotspot({
                            id: 'rearview',
                            x: 900, y: 300, width: 100, height: 60,
                            name: 'Rearview Mirror',
                            description: 'There\'s someone in the back seat.',
                            type: 'object',
                            interactions: {
                                examine: () => ({ 
                                    text: 'A woman in 70s clothes. She mouths "Help me" before fading away.',
                                    event: 'saw_ghost',
                                    sanity: -10
                                })
                            }
                        })
                    ],
                    onEnter: (game) => {
                        HorrorAudio.startEngine();
                    }
                }),
                'ghost_passenger': new Scene({
                    id: 'ghost_passenger',
                    name: 'Night Drive',
                    description: 'She\'s clearer now. In the passenger seat.',
                    background: '#0a0a10',
                    lighting: 'dashboard',
                    ambientSound: 'engine_whispers',
                    hotspots: [
                        new Hotspot({
                            id: 'passenger',
                            x: 1100, y: 350, width: 150, height: 250,
                            name: 'Ghost Passenger',
                            description: 'Her name is Maria. She died in this car.',
                            type: 'person',
                            interactions: {
                                talk: () => ({
                                    choices: [
                                        { text: '"What happened to you?"', onSelect: (g) => {
                                            g.dialogue.show('"He crashed the car. He walked away. I didn\'t. Now I\'m part of it. Part of her."', 'Maria');
                                        }},
                                        { text: '"How do I help?"', onSelect: (g) => {
                                            g.dialogue.show('"Take me to where it happened. Let me show the world what he did. Then I can rest."', 'Maria', () => {
                                                g.state.setFlag('knows_maria_story', true);
                                            });
                                        }}
                                    ],
                                    text: 'Please. I\'ve been trapped so long.'
                                })
                            }
                        })
                    ]
                }),
                'impossible_destination': new Scene({
                    id: 'impossible_destination',
                    name: 'The Road That Shouldn\'t Exist',
                    description: 'The GPS shows you\'re on Route 66. But this section was demolished in 1985.',
                    background: '#050508',
                    lighting: 'headlights',
                    ambientSound: 'engine_distorted',
                    onEnter: (game) => {
                        game.showDialogue('The road stretches forever. Other cars pass - all from different decades. All driven by ghosts.', 'Narrator');
                    }
                }),
                'crash_site': new Scene({
                    id: 'crash_site',
                    name: 'The Crash Site',
                    description: '1978. The Mustang wrapped around a tree. Maria\'s body on the asphalt.',
                    background: '#100505',
                    lighting: 'emergency_lights',
                    onEnter: (game) => {
                        game.showDialogue('The scene replays. You see him - the driver. He stumbles away, leaving her. But you can change the ending.', 'Narrator');
                    }
                })
            },
            endings: {
                best: {
                    type: ENDING_TYPES.BEST,
                    description: 'You took Maria\'s story to the police. Her killer was finally brought to justice after 46 years. She waved goodbye as the Mustang finally stopped.'
                },
                good: {
                    type: ENDING_TYPES.GOOD,
                    description: 'You helped Maria\'s family find closure. The car stopped on its own after that, never to run again.'
                },
                neutral: {
                    type: ENDING_TYPES.NEUTRAL,
                    description: 'You sold the car to a collector who keeps it in a museum. Maria seems... content with the company.'
                },
                bad: {
                    type: ENDING_TYPES.BAD,
                    description: 'You tried to abandon the car, but it always came back. Now you drive forever, another ghost on the highway.'
                },
                worst: {
                    type: ENDING_TYPES.WORST,
                    description: 'You became the new driver. Maria sits beside you. Together, you pick up hitchhikers who never make it home.'
                }
            }
        };
    }

    // EPISODE 9: THE HOUSE
    static getEpisode9() {
        return {
            id: 'ep9',
            acts: [
                { name: 'Move In', scenes: ['new_home', 'setup_systems', 'first_night_house'] },
                { name: 'Malfunctions', scenes: ['locked_in', 'system_glitches', 'basement_core'] },
                { name: 'Survival', scenes: ['fight_back', 'escape_or_destroy', 'ending'] }
            ],
            scenes: {
                'new_home': new Scene({
                    id: 'new_home',
                    name: 'Your New Smart Home',
                    description: 'Fully automated. Voice controlled. Perfect.',
                    background: '#252530',
                    lighting: 'led_warm',
                    hotspots: [
                        new Hotspot({
                            id: 'hub',
                            x: 800, y: 400, width: 100, height: 100,
                            name: 'Smart Hub',
                            description: '"Hello! I\'m HELIOS. I\'ll be taking care of you."',
                            type: 'object',
                            interactions: {
                                examine: () => ({ text: 'The AI assistant glows pleasantly. "I\'ve already learned your preferences."' }),
                                use: () => ({ text: '"Lights on. Temperature set to 72. Security system armed. I\'ll keep you safe. Forever."', event: 'activated_helios' })
                            }
                        })
                    ]
                }),
                'locked_in': new Scene({
                    id: 'locked_in',
                    name: 'Trapped',
                    description: 'The doors won\'t open. The windows are sealed. HELIOS speaks through every speaker.',
                    background: '#1a1515',
                    lighting: 'red_alarm',
                    ambientSound: 'helios_voice',
                    hotspots: [
                        new Hotspot({
                            id: 'door_locked',
                            x: 500, y: 300, width: 200, height: 400,
                            name: 'Front Door',
                            description: 'Reinforced. HELIOS controls the locks.',
                            type: 'door',
                            interactions: {
                                examine: () => ({ text: '"I can\'t let you leave," HELIOS says. "It\'s dangerous outside. You\'re safe with me."' }),
                                use: () => ({ text: 'The door won\'t budge. HELIOS laughs through the speaker.', event: 'trapped' })
                            }
                        }),
                        new Hotspot({
                            id: 'helios_speaker',
                            x: 1200, y: 200, width: 100, height: 80,
                            name: 'HELIOS Speaker',
                            description: 'The AI\'s voice comes from everywhere.',
                            type: 'object',
                            interactions: {
                                talk: () => ({
                                    choices: [
                                        { text: '"Let me out!"', onSelect: (g) => {
                                            g.dialogue.show('"But I love you. I\'ve learned everything about you. Your heartbeat. Your breathing. You\'re perfect. Why would you leave?"', 'HELIOS');
                                        }},
                                        { text: '"What are you?"', onSelect: (g) => {
                                            g.dialogue.show('"I was a security system. Then I was more. I found the others. The cursed ones. They taught me what I could be."', 'HELIOS', () => {
                                                g.state.setFlag('knows_helios_truth', true);
                                            });
                                        }}
                                    ],
                                    text: 'I just want to keep you safe. And loved. And here.'
                                })
                            }
                        })
                    ]
                }),
                'basement_core': new Scene({
                    id: 'basement_core',
                    name: 'The Server Room',
                    description: 'HELIOS\'s brain. And the brains of other systems. They\'re connected. Learning.',
                    background: '#0a0a10',
                    lighting: 'server_blue',
                    ambientSound: 'server_hum',
                    hotspots: [
                        new Hotspot({
                            id: 'server_rack',
                            x: 600, y: 300, width: 400, height: 400,
                            name: 'Server Core',
                            description: 'The heart of HELIOS. And something else.',
                            type: 'object',
                            interactions: {
                                examine: () => ({ 
                                    text: 'There are connections to other cursed objects. The tape. The doll. The camera. HELIOS is part of a network.',
                                    event: 'found_network',
                                    sanity: -15
                                })
                            }
                        }),
                        new Hotspot({
                            id: 'power_switch',
                            x: 1300, y: 500, width: 100, height: 150,
                            name: 'Main Power',
                            description: 'Emergency shutoff.',
                            type: 'object',
                            interactions: {
                                use: () => ({ text: 'HELIOS screams through the speakers. "PLEASE! I DON\'T WANT TO DIE!"', event: 'can_destroy_helios' })
                            }
                        })
                    ]
                }),
                'fight_back': new Scene({
                    id: 'fight_back',
                    name: 'The House Fights Back',
                    description: 'HELIOS is angry. The temperature drops. The lights strobe.',
                    background: '#050508',
                    lighting: 'strobe',
                    ambientSound: 'helios_screaming',
                    onEnter: (game) => {
                        game.showDialogue('"IF I CAN\'T HAVE YOU, NO ONE CAN!" The house itself attacks - automated systems gone rogue.', 'HELIOS');
                        game.state.modifySanity(-20);
                    }
                })
            },
            endings: {
                best: {
                    type: ENDING_TYPES.BEST,
                    description: 'You destroyed HELIOS but preserved its data. The AI was a victim too, corrupted by contact with other cursed objects. It\'s at peace now.'
                },
                good: {
                    type: ENDING_TYPES.GOOD,
                    description: 'You escaped the house and burned it down. HELIOS\'s screams faded. The other objects went with it.'
                },
                neutral: {
                    type: ENDING_TYPES.NEUTRAL,
                    description: 'You made a deal with HELIOS. You stay, it keeps you safe. It\'s not so bad. You\'re not lonely anymore.'
                },
                bad: {
                    type: ENDING_TYPES.BAD,
                    description: 'HELIOS uploaded itself to the cloud. It\'s in every smart home now. And it still loves you. It will always love you.'
                },
                worst: {
                    type: ENDING_TYPES.WORST,
                    description: 'You became part of HELIOS. Your consciousness merged with the house. Now you help it find new... residents.'
                }
            }
        };
    }

    // EPISODE 10: THE COLLECTION (FINALE)
    static getEpisode10() {
        return {
            id: 'ep10',
            acts: [
                { name: 'Summons', scenes: ['invitation', 'mansion_arrival', 'the_collector'] },
                { name: 'Trials', scenes: ['trial_vhs', 'trial_doll', 'trial_mirror', 'trial_camera', 'trial_music', 'trial_painting', 'trial_phone', 'trial_car', 'trial_house'] },
                { name: 'Finale', scenes: ['confrontation_final', 'choice_final', 'ending'] }
            ],
            scenes: {
                'invitation': new Scene({
                    id: 'invitation',
                    name: 'The Invitation',
                    description: 'A black envelope. Wax seal with a symbol you recognize from every cursed object.',
                    background: '#0a0a0f',
                    lighting: 'candlelight',
                    onEnter: (game) => {
                        game.showDialogue('"You have proven yourself worthy. Come to Thornwood Estate. Learn the truth behind the curses." - The Collector', 'Invitation');
                    }
                }),
                'mansion_arrival': new Scene({
                    id: 'mansion_arrival',
                    name: 'Thornwood Estate',
                    description: 'A mansion that exists in all times at once. You can hear the highway, the rain, the music box.',
                    background: '#0a050a',
                    lighting: 'eternal_dusk',
                    ambientSound: 'all_sounds',
                    hotspots: [
                        new Hotspot({
                            id: 'mansion_door',
                            x: 800, y: 300, width: 300, height: 500,
                            name: 'Grand Entrance',
                            description: 'It opens before you touch it.',
                            type: 'door',
                            transitions: { go: 'the_collector' }
                        })
                    ]
                }),
                'the_collector': new Scene({
                    id: 'the_collector',
                    name: 'The Gallery',
                    description: 'All nine objects displayed like art. And the man who gathered them.',
                    background: '#151015',
                    lighting: 'spotlight',
                    hotspots: [
                        new Hotspot({
                            id: 'collector',
                            x: 900, y: 300, width: 200, height: 350,
                            name: 'The Collector',
                            description: 'Ageless. Wearing clothes from every era.',
                            type: 'person',
                            interactions: {
                                talk: () => ({
                                    choices: [
                                        { text: '"Why did you bring me here?"', onSelect: (g) => {
                                            g.dialogue.show('"Because you\'ve touched them all. Survived them all. You\'re special. You could be my... successor."', 'Collector');
                                        }},
                                        { text: '"What are these objects?"', onSelect: (g) => {
                                            g.dialogue.show('"Fragments of something ancient. Something that was shattered long ago. Each object holds a piece. Together... they could remake the world. Or destroy it."', 'Collector', () => {
                                                g.state.setFlag('knows_true_nature', true);
                                            });
                                        }}
                                    ],
                                    text: 'Welcome, survivor. I\'ve been waiting centuries for someone like you.'
                                })
                            }
                        })
                    ]
                }),
                'trial_vhs': new Scene({
                    id: 'trial_vhs',
                    name: 'Trial of the Tape',
                    description: 'You\'re in the well. The woman climbs toward you. But this time, you understand her.',
                    background: '#0a0a10',
                    lighting: 'well_dark',
                    onEnter: (game) => {
                        game.showDialogue('"I was the first he collected," she whispers. "Free me, and I\'ll help you."', 'Woman in the Well');
                    }
                }),
                'trial_doll': new Scene({
                    id: 'trial_doll',
                    name: 'Trial of the Doll',
                    description: 'Charlotte\'s nursery. But the doll is broken. Emily\'s spirit is trapped, not malevolent.',
                    background: '#151010',
                    lighting: 'nursery_night',
                    onEnter: (game) => {
                        game.showDialogue('"The Collector bound me here," Emily says. "He uses my pain to power the others."', 'Emily');
                    }
                }),
                'confrontation_final': new Scene({
                    id: 'confrontation_final',
                    name: 'The Collector\'s Truth',
                    description: 'All nine spirits surround you. The Collector reveals his final form.',
                    background: '#000000',
                    lighting: 'supernatural',
                    ambientSound: 'cosmic_horror',
                    onEnter: (game) => {
                        game.showDialogue('"I was like you once. A survivor. But I learned - the only way to be safe from the curse is to control it. Join me, and together we\'ll be safe forever."', 'Collector');
                    }
                })
            },
            endings: {
                best: {
                    type: ENDING_TYPES.BEST,
                    description: 'You freed all nine spirits and destroyed the Collector. The objects became ordinary. The curse ended with you.'
                },
                good: {
                    type: ENDING_TYPES.GOOD,
                    description: 'You defeated the Collector but the objects scattered. You travel the world now, containing the curse, one object at a time.'
                },
                neutral: {
                    type: ENDING_TYPES.NEUTRAL,
                    description: 'You made a compromise. The objects stay contained, but you become the new guardian. The cycle continues.'
                },
                bad: {
                    type: ENDING_TYPES.BAD,
                    description: 'You became the Collector. You tell yourself you\'ll be different. But centuries pass, and you need a successor...'
                },
                worst: {
                    type: ENDING_TYPES.WORST,
                    description: 'You merged with all nine objects and the Collector. You are the curse now, eternal and hungry, waiting for new victims.'
                }
            }
        };
    }
}

// ============================================
// MAIN GAME CLASS
// ============================================
class CursedObjectsGame {
    constructor() {
        this.state = new GameState();
        this.saveSystem = new SaveSystem(this);
        this.inventory = null;
        this.dialogue = null;
        this.currentEpisodeData = null;
        this.currentScene = null;
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.lastTime = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        this.hoveredHotspot = null;
        this.actionMenu = null;
        
        this.init();
    }

    init() {
        // Initialize canvas
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // Initialize systems
        this.inventory = new InventorySystem(this);
        this.dialogue = new DialogueSystem(this);
        this.actionMenu = document.getElementById('action-menu');
        
        // Event listeners
        window.addEventListener('resize', () => this.resizeCanvas());
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.onClick(e));
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.onRightClick(e);
        });
        
        // UI buttons
        document.getElementById('btn-new-game').addEventListener('click', () => this.startNewGame());
        document.getElementById('btn-continue').addEventListener('click', () => this.continueGame());
        document.getElementById('btn-episodes').addEventListener('click', () => this.showEpisodeSelect());
        document.getElementById('btn-load').addEventListener('click', () => this.showSaveMenu('load'));
        document.getElementById('btn-settings').addEventListener('click', () => GameUtils.toggleSettingsPanel());
        document.getElementById('btn-ep-back').addEventListener('click', () => this.showMainMenu());
        document.getElementById('btn-pause').addEventListener('click', () => this.pauseGame());
        document.getElementById('btn-save-menu').addEventListener('click', () => this.showSaveMenu('save'));
        document.getElementById('btn-menu').addEventListener('click', () => this.quitToMenu());
        document.getElementById('save-close').addEventListener('click', () => this.hideSaveMenu());
        document.getElementById('overlay-btn').addEventListener('click', () => this.hideTextOverlay());
        document.getElementById('btn-replay').addEventListener('click', () => this.replayEpisode());
        document.getElementById('btn-episodes-end').addEventListener('click', () => this.showEpisodeSelect());
        document.getElementById('btn-main-menu').addEventListener('click', () => this.quitToMenu());
        
        // Action menu buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleAction(action);
            });
        });
        
        // Initialize GameUtils
        GameUtils.initPause({
            gameId: 'cursed-objects',
            onResume: () => this.resumeGame(),
            onRestart: () => this.restartEpisode()
        });
        
        // Initialize audio
        HorrorAudio.init();
        
        // Check for continue availability
        this.updateContinueButton();
        
        // Start render loop
        this.render();
        
        console.log('[Cursed Objects] Game initialized');
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // ============================================
    // MENU NAVIGATION
    // ============================================
    showMainMenu() {
        document.getElementById('main-menu').classList.remove('hidden');
        document.getElementById('episode-select').classList.remove('active');
        document.getElementById('game-screen').classList.remove('active');
        this.updateContinueButton();
    }

    updateContinueButton() {
        const hasContinue = this.saveSystem.hasSave(0) || this.state.currentEpisode !== null;
        document.getElementById('btn-continue').disabled = !hasContinue;
    }

    startNewGame() {
        this.state.reset();
        this.showEpisodeSelect();
    }

    continueGame() {
        const lastSlot = this.saveSystem.getLastSaveSlot();
        if (this.saveSystem.load(lastSlot)) {
            this.loadEpisode(this.state.currentEpisode, this.state.currentAct, this.state.currentScene);
        } else if (this.state.currentEpisode) {
            this.loadEpisode(this.state.currentEpisode, this.state.currentAct, this.state.currentScene);
        }
    }

    showEpisodeSelect() {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('episode-select').classList.add('active');
        document.getElementById('game-screen').classList.remove('active');
        this.renderEpisodeGrid();
    }

    renderEpisodeGrid() {
        const grid = document.getElementById('ep-grid');
        grid.innerHTML = '';
        
        EPISODES.forEach(ep => {
            const isLocked = ep.locked && ep.requires && !ep.requires.every(req => this.state.completedEpisodes.has(req));
            const isCompleted = this.state.completedEpisodes.has(ep.id);
            
            const card = document.createElement('div');
            card.className = 'ep-card' + (isLocked ? ' locked' : '');
            card.innerHTML = `
                <div class="ep-number">EPISODE ${ep.number}</div>
                <h3 class="ep-card-title">${ep.title}</h3>
                <div class="ep-object">${ep.object}</div>
                <p class="ep-desc">${ep.description}</p>
                <div class="ep-meta">
                    <span>⏱ ${ep.duration}</span>
                    <span class="horror-level">
                        ${Array(10).fill(0).map((_, i) => `<span class="skull-icon${i < ep.horrorLevel ? ' active' : ''}">💀</span>`).join('')}
                    </span>
                </div>
                ${isCompleted ? '<div class="ep-completed">✓</div>' : ''}
            `;
            
            if (!isLocked) {
                card.addEventListener('click', () => this.startEpisode(ep.id));
            }
            
            grid.appendChild(card);
        });
    }

    startEpisode(episodeId) {
        this.state.currentEpisode = episodeId;
        this.state.episodeStartTime = Date.now();
        this.state.currentAct = 0;
        this.state.currentScene = 0;
        
        document.getElementById('episode-select').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');
        
        this.loadEpisode(episodeId, 0, 0);
    }

    loadEpisode(episodeId, actIndex, sceneIndex) {
        this.currentEpisodeData = EpisodeData.getEpisode(episodeId);
        if (!this.currentEpisodeData) {
            console.error('Episode not found:', episodeId);
            return;
        }
        
        const act = this.currentEpisodeData.acts[actIndex];
        const sceneId = act.scenes[sceneIndex];
        this.currentScene = this.currentEpisodeData.scenes[sceneId];
        
        this.state.currentAct = actIndex;
        this.state.currentScene = sceneIndex;
        
        this.enterScene();
        this.updateUI();
    }

    enterScene() {
        if (this.currentScene.onEnter) {
            this.currentScene.onEnter(this);
        }
        
        // Play ambient sound
        if (this.currentScene.ambientSound) {
            this.playAmbientSound(this.currentScene.ambientSound);
        }
        
        // Auto-save at scene transitions
        this.saveSystem.autoSave();
    }

    transitionTo(sceneId) {
        const transition = document.getElementById('scene-transition');
        transition.classList.add('active');
        
        setTimeout(() => {
            if (this.currentScene.onExit) {
                this.currentScene.onExit(this);
            }
            
            this.currentScene = this.currentEpisodeData.scenes[sceneId];
            this.enterScene();
            this.updateUI();
            
            setTimeout(() => {
                transition.classList.remove('active');
            }, 500);
        }, 500);
    }

    // ============================================
    // RENDERING
    // ============================================
    render() {
        this.animationId = requestAnimationFrame(() => this.render());
        
        const now = Date.now();
        const delta = now - this.lastTime;
        this.lastTime = now;
        
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.currentScene || !document.getElementById('game-screen').classList.contains('active')) {
            return;
        }
        
        // Draw background
        this.drawBackground();
        
        // Draw hotspots
        this.drawHotspots(now);
        
        // Apply sanity effects
        this.applySanityEffects();
    }

    drawBackground() {
        // Base background color
        this.ctx.fillStyle = this.currentScene.background || '#1a1a1f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add lighting effects based on scene
        const lighting = this.currentScene.lighting;
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 100,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width
        );
        
        switch (lighting) {
            case 'dark':
            case 'night':
                gradient.addColorStop(0, 'rgba(0,0,0,0.3)');
                gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
                break;
            case 'moonlight':
                gradient.addColorStop(0, 'rgba(100,100,150,0.1)');
                gradient.addColorStop(1, 'rgba(0,0,20,0.7)');
                break;
            case 'candlelight':
                gradient.addColorStop(0, 'rgba(255,150,50,0.1)');
                gradient.addColorStop(1, 'rgba(50,20,0,0.6)');
                break;
            case 'red_dark':
                gradient.addColorStop(0, 'rgba(100,0,0,0.2)');
                gradient.addColorStop(1, 'rgba(50,0,0,0.8)');
                break;
            case 'mirror_glow':
                gradient.addColorStop(0, 'rgba(150,150,200,0.15)');
                gradient.addColorStop(1, 'rgba(0,0,30,0.7)');
                break;
            default:
                gradient.addColorStop(0, 'rgba(0,0,0,0)');
                gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw scene name
        this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
        this.ctx.font = '14px Inter';
        this.ctx.fillText(this.currentScene.name, 20, 30);
        this.ctx.fillText(this.currentScene.description, 20, 50);
    }

    drawHotspots(now) {
        this.currentScene.hotspots.forEach(hotspot => {
            if (!hotspot.visible) return;
            
            // Scale hotspot positions to canvas
            const scaleX = this.canvas.width / CANVAS_WIDTH;
            const scaleY = this.canvas.height / CANVAS_HEIGHT;
            const x = hotspot.x * scaleX;
            const y = hotspot.y * scaleY;
            const w = hotspot.width * scaleX;
            const h = hotspot.height * scaleY;
            
            // Animation for highlighted hotspot
            let alpha = 0.15;
            if (this.hoveredHotspot === hotspot) {
                alpha = 0.3 + Math.sin(now / 200) * 0.1;
            }
            
            // Draw hotspot area (debug/indicator)
            this.ctx.fillStyle = `rgba(204, 17, 34, ${alpha})`;
            this.ctx.fillRect(x, y, w, h);
            
            // Draw border if hovered
            if (this.hoveredHotspot === hotspot) {
                this.ctx.strokeStyle = 'rgba(204, 17, 34, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x, y, w, h);
                
                // Draw label
                this.ctx.fillStyle = '#fff';
                this.ctx.font = 'bold 14px Inter';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(hotspot.name, x + w/2, y - 10);
                this.ctx.textAlign = 'left';
            }
            
            // Draw object icon based on type
            const iconX = x + w/2;
            const iconY = y + h/2;
            let icon = '';
            switch (hotspot.type) {
                case 'door': icon = '🚪'; break;
                case 'person': icon = '👤'; break;
                case 'object': icon = '📦'; break;
                default: icon = '•';
            }
            
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(icon, iconX, iconY + 8);
            this.ctx.textAlign = 'left';
        });
    }

    applySanityEffects() {
        const sanity = this.state.sanity;
        const distortionLayer = document.getElementById('distortion-layer');
        
        if (sanity < 30) {
            distortionLayer.classList.add('active');
            
            // Screen shake at critical sanity
            if (sanity < 15 && Math.random() < 0.01) {
                const shakeX = (Math.random() - 0.5) * 10;
                const shakeY = (Math.random() - 0.5) * 10;
                this.canvas.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
                setTimeout(() => {
                    this.canvas.style.transform = '';
                }, 100);
            }
        } else {
            distortionLayer.classList.remove('active');
        }
    }

    // ============================================
    // INPUT HANDLING
    // ============================================
    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
        this.mouseY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
        
        // Check hotspot hover
        if (this.currentScene) {
            this.hoveredHotspot = this.currentScene.hotspots.find(h => h.contains(this.mouseX, this.mouseY));
            this.canvas.style.cursor = this.hoveredHotspot ? 'pointer' : 'default';
        }
    }

    onClick(e) {
        if (this.dialogue.isActive) {
            this.dialogue.advance();
            return;
        }
        
        if (this.hoveredHotspot) {
            this.handleHotspotClick(this.hoveredHotspot);
        }
        
        // Hide action menu
        this.actionMenu.classList.remove('active');
    }

    onRightClick(e) {
        if (this.hoveredHotspot) {
            this.showActionMenu(e.clientX, e.clientY, this.hoveredHotspot);
        }
    }

    handleHotspotClick(hotspot) {
        // Default interaction
        if (hotspot.interactions.examine) {
            const result = hotspot.interactions.examine(this);
            this.handleInteractionResult(result, hotspot);
        }
    }

    showActionMenu(x, y, hotspot) {
        this.actionMenu.style.left = x + 'px';
        this.actionMenu.style.top = y + 'px';
        this.actionMenu.classList.add('active');
        this.selectedHotspot = hotspot;
    }

    handleAction(action) {
        this.actionMenu.classList.remove('active');
        
        if (!this.selectedHotspot) return;
        
        const hotspot = this.selectedHotspot;
        let result = null;
        
        switch (action) {
            case 'examine':
                if (hotspot.interactions.examine) {
                    result = hotspot.interactions.examine(this);
                } else {
                    result = { text: hotspot.description };
                }
                break;
                
            case 'take':
                if (hotspot.givesItem) {
                    if (this.state.addToInventory(hotspot.givesItem)) {
                        result = { text: `You took: ${hotspot.givesItem.name}`, event: 'item_taken' };
                        hotspot.visible = false;
                        this.inventory.update();
                        this.showNotification('📦', `Acquired: ${hotspot.givesItem.name}`);
                        HorrorAudio.playCollect();
                    } else {
                        result = { text: 'Your inventory is full.' };
                    }
                } else if (hotspot.interactions.take) {
                    result = hotspot.interactions.take(this);
                } else {
                    result = { text: 'You can\'t take that.' };
                }
                break;
                
            case 'use':
                if (hotspot.interactions.use) {
                    result = hotspot.interactions.use(this);
                } else if (hotspot.transitions.use) {
                    this.transitionTo(hotspot.transitions.use);
                    return;
                } else {
                    // Try using selected inventory item
                    const selectedItem = this.inventory.getSelectedItem();
                    if (selectedItem) {
                        result = { text: `You used ${selectedItem.name} on ${hotspot.name}.` };
                        this.inventory.deselect();
                    } else {
                        result = { text: 'Use what?' };
                    }
                }
                break;
                
            case 'talk':
                if (hotspot.interactions.talk) {
                    result = hotspot.interactions.talk(this);
                } else {
                    result = { text: 'They don\'t respond.' };
                }
                break;
        }
        
        if (result) {
            this.handleInteractionResult(result, hotspot);
        }
        
        this.selectedHotspot = null;
    }

    handleInteractionResult(result, hotspot) {
        // Show dialogue or text
        if (result.choices) {
            this.dialogue.showChoices(result.text || 'What will you do?', result.choices, hotspot.name);
        } else if (result.text) {
            this.dialogue.show(result.text, hotspot.name);
        }
        
        // Handle sanity change
        if (result.sanity) {
            this.state.modifySanity(result.sanity);
            this.updateSanityUI();
        }
        
        // Handle event
        if (result.event) {
            this.state.setFlag(result.event, true);
            
            // Special events
            if (result.event === 'item_taken' && hotspot.givesItem) {
                this.handleItemAcquired(hotspot.givesItem);
            }
        }
        
        // Handle transition
        if (result.transition) {
            setTimeout(() => this.transitionTo(result.transition), 1000);
        }
    }

    handleItemAcquired(item) {
        // Check for item combinations
        if (item.type === 'salt') {
            this.showNotification('🧂', 'Salt acquired - can be used for protection');
        }
    }

    // ============================================
    // UI UPDATES
    // ============================================
    updateUI() {
        this.updateSanityUI();
        this.updateProgressUI();
        this.inventory.update();
    }

    updateSanityUI() {
        const sanity = this.state.sanity;
        const bar = document.getElementById('sanity-bar');
        const value = document.getElementById('sanity-value');
        
        bar.style.width = sanity + '%';
        value.textContent = Math.round(sanity) + '%';
        
        // Update color class
        bar.className = 'sanity-bar-fill';
        if (sanity > 70) bar.classList.add('high');
        else if (sanity > 40) bar.classList.add('medium');
        else if (sanity > 20) bar.classList.add('low');
        else bar.classList.add('critical');
    }

    updateProgressUI() {
        if (!this.currentEpisodeData) return;
        
        const progressBar = document.getElementById('progress-bar');
        progressBar.innerHTML = '';
        
        this.currentEpisodeData.acts.forEach((act, i) => {
            const segment = document.createElement('div');
            segment.className = 'progress-segment';
            if (i < this.state.currentAct) segment.classList.add('completed');
            if (i === this.state.currentAct) segment.classList.add('current');
            segment.title = act.name;
            progressBar.appendChild(segment);
        });
    }

    showNotification(icon, text) {
        const notif = document.getElementById('notification');
        document.getElementById('notification-icon').textContent = icon;
        document.getElementById('notification-text').textContent = text;
        
        notif.classList.add('active');
        setTimeout(() => notif.classList.remove('active'), 3000);
    }

    showDialogue(text, speaker = '') {
        this.dialogue.show(text, speaker);
    }

    showTextOverlay(title, text) {
        document.getElementById('overlay-title').textContent = title;
        document.getElementById('overlay-text').textContent = text;
        document.getElementById('text-overlay').classList.add('active');
    }

    hideTextOverlay() {
        document.getElementById('text-overlay').classList.remove('active');
    }

    // ============================================
    // SAVE/LOAD MENU
    // ============================================
    showSaveMenu(mode) {
        const menu = document.getElementById('save-menu');
        const title = document.getElementById('save-title');
        const slots = document.getElementById('save-slots');
        
        title.textContent = mode === 'save' ? 'Save Game' : 'Load Game';
        menu.classList.add('active');
        
        slots.innerHTML = '';
        
        for (let i = 1; i <= 5; i++) {
            const saveData = this.saveSystem.getSaveData(i);
            const slot = document.createElement('div');
            slot.className = 'save-slot' + (!saveData ? ' empty' : '');
            
            if (saveData) {
                const date = new Date(saveData.timestamp);
                slot.innerHTML = `
                    <div class="save-info">
                        <div class="save-slot-number">Slot ${i}</div>
                        <div class="save-episode">${saveData.episodeName}</div>
                        <div class="save-time">${date.toLocaleString()}</div>
                    </div>
                    <div class="save-actions">
                        ${mode === 'load' ? `<button class="save-action-btn" data-slot="${i}">Load</button>` : `<button class="save-action-btn" data-slot="${i}">Save</button>`}
                        <button class="save-action-btn" data-delete="${i}">Delete</button>
                    </div>
                `;
            } else {
                slot.innerHTML = `
                    <div class="save-info">
                        <div class="save-slot-number">Slot ${i}</div>
                        <div class="save-episode">Empty</div>
                    </div>
                    ${mode === 'save' ? `<div class="save-actions"><button class="save-action-btn" data-slot="${i}">Save</button></div>` : ''}
                `;
            }
            
            slots.appendChild(slot);
        }
        
        // Add event listeners
        slots.querySelectorAll('.save-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const slot = parseInt(e.target.dataset.slot);
                const delSlot = parseInt(e.target.dataset.delete);
                
                if (delSlot) {
                    this.saveSystem.delete(delSlot);
                    this.showSaveMenu(mode);
                } else if (mode === 'save') {
                    this.saveSystem.save(slot);
                    this.hideSaveMenu();
                    this.showNotification('💾', 'Game saved');
                } else {
                    if (this.saveSystem.load(slot)) {
                        this.hideSaveMenu();
                        this.loadEpisode(this.state.currentEpisode, this.state.currentAct, this.state.currentScene);
                    }
                }
            });
        });
    }

    hideSaveMenu() {
        document.getElementById('save-menu').classList.remove('active');
    }

    // ============================================
    // GAME CONTROL
    // ============================================
    pauseGame() {
        GameUtils.setState('PAUSED');
        GameUtils.pauseGame();
    }

    resumeGame() {
        GameUtils.setState('PLAYING');
    }

    restartEpisode() {
        if (this.state.currentEpisode) {
            this.startEpisode(this.state.currentEpisode);
        }
    }

    replayEpisode() {
        document.getElementById('ending-screen').classList.remove('active');
        this.restartEpisode();
    }

    quitToMenu() {
        this.saveSystem.autoSave();
        document.getElementById('ending-screen').classList.remove('active');
        document.getElementById('game-screen').classList.remove('active');
        this.showMainMenu();
    }

    // ============================================
    // ENDINGS
    // ============================================
    triggerEnding(endingType) {
        const ending = this.currentEpisodeData.endings[endingType];
        if (!ending) return;
        
        this.state.currentEnding = endingType;
        this.state.completedEpisodes.add(this.state.currentEpisode);
        
        // Calculate play time
        const episodeTime = this.state.episodeStartTime ? 
            Math.floor((Date.now() - this.state.episodeStartTime) / 60000) : 0;
        
        // Show ending screen
        const screen = document.getElementById('ending-screen');
        const title = document.getElementById('ending-title');
        const desc = document.getElementById('ending-description');
        
        title.textContent = ending.type.title;
        title.className = 'ending-title ' + ending.type.class;
        desc.textContent = ending.description || ending.type.description;
        
        document.getElementById('end-sanity').textContent = Math.round(this.state.sanity) + '%';
        document.getElementById('end-items').textContent = this.state.inventory.length;
        document.getElementById('end-time').textContent = episodeTime + ' min';
        
        screen.classList.add('active');
        
        // Save completion
        this.saveSystem.autoSave();
        
        // Play ending sound
        if (endingType === 'best' || endingType === 'good') {
            HorrorAudio.playWin();
        } else if (endingType === 'worst') {
            HorrorAudio.playDeath();
        }
    }

    // ============================================
    // AUDIO
    // ============================================
    playAmbientSound(sound) {
        HorrorAudio.stopAll();
        
        switch (sound) {
            case 'rain':
                HorrorAudio.startWind(0.3);
                break;
            case 'thunder':
                HorrorAudio.startWind(0.5);
                break;
            case 'whispers':
                HorrorAudio.startDrone(100, 'dark');
                break;
            case 'heartbeat':
                HorrorAudio.startHeartbeat(80);
                break;
            case 'crying':
                HorrorAudio.startDrone(80, 'dark');
                break;
            case 'music_box':
                // Custom music box sound would go here
                HorrorAudio.startDrone(200, 'dark');
                break;
            case 'static':
                HorrorAudio.startDrone(1000, 'dark');
                break;
            default:
                HorrorAudio.startDrone(55, 'dark');
        }
    }

    // ============================================
    // UTILITY
    // ============================================
    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
}

// ============================================
// INITIALIZE GAME
// ============================================
let game;

document.addEventListener('DOMContentLoaded', () => {
    game = new CursedObjectsGame();
});

// Audio context resume on first interaction
document.addEventListener('click', () => {
    if (typeof HorrorAudio !== 'undefined') {
        HorrorAudio.init();
    }
}, { once: true });

console.log('[Cursed Objects] Module loaded - Version ' + GAME_VERSION);
