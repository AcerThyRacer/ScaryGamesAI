/**
 * ASYLUM ARCHITECT - Reverse Horror Strategy Game
 * You are the ghost. Haunt them all.
 * 
 * @author Game AI
 * @version 1.0.0
 */

'use strict';

// ==========================================
// CONSTANTS & CONFIGURATION
// ==========================================

const GAME_VERSION = '1.0.0';
const TICK_RATE = 1000 / 30; // 30 FPS game logic
const DAY_LENGTH = 600; // 10 minutes per day cycle

const DIFFICULTY = {
    EASY: { essenceRegen: 2, suspicionDecay: 0.5, aiAlertness: 0.7 },
    NORMAL: { essenceRegen: 1, suspicionDecay: 0.3, aiAlertness: 1.0 },
    HARD: { essenceRegen: 0.5, suspicionDecay: 0.1, aiAlertness: 1.3 },
    NIGHTMARE: { essenceRegen: 0.3, suspicionDecay: 0, aiAlertness: 1.6 }
};

const ROOM_TYPES = {
    CELL: { color: '#1e293b', label: 'Cell' },
    CORRIDOR: { color: '#334155', label: 'Corridor' },
    COMMON: { color: '#475569', label: 'Common Room' },
    DINING: { color: '#64748b', label: 'Dining Hall' },
    INFIRMARY: { color: '#0891b2', label: 'Infirmary' },
    OFFICE: { color: '#7c3aed', label: 'Office' },
    SECURITY: { color: '#dc2626', label: 'Security' },
    STORAGE: { color: '#525252', label: 'Storage' },
    BASEMENT: { color: '#171717', label: 'Basement' },
    GARDEN: { color: '#166534', label: 'Garden' },
    CHAPEL: { color: '#fbbf24', label: 'Chapel' },
    LAB: { color: '#06b6d4', label: 'Laboratory' },
    ELECTRICAL: { color: '#eab308', label: 'Electrical' },
    ISOLATION: { color: '#000000', label: 'Isolation' }
};

const CHARACTER_TYPES = {
    PATIENT: 'patient',
    STAFF: 'staff',
    INVESTIGATOR: 'investigator'
};

const MENTAL_STATES = {
    STABLE: { name: 'Stable', color: '#22d3ee', multiplier: 1.0 },
    UNEASY: { name: 'Uneasy', color: '#a3e635', multiplier: 1.2 },
    ANXIOUS: { name: 'Anxious', color: '#fbbf24', multiplier: 1.5 },
    TERRIFIED: { name: 'Terrified', color: '#f97316', multiplier: 2.0 },
    CATATONIC: { name: 'Catatonic', color: '#94a3b8', multiplier: 0.5 },
    VIOLENT: { name: 'Violent', color: '#dc2626', multiplier: 2.5 },
    HYSTERICAL: { name: 'Hysterical', color: '#e879f9', multiplier: 3.0 },
    POSSESSED: { name: 'Possessed', color: '#6366f1', multiplier: 1.0 }
};

const FEAR_TYPES = [
    'darkness', 'confined', 'heights', 'blood', 'needles',
    'ghosts', 'demons', 'spiders', 'snakes', 'rats',
    'fire', 'water', 'crowds', 'solitude', 'mirrors',
    'clowns', 'dolls', 'death', 'pain', 'unknown'
];

const SCHEDULE_ACTIVITIES = {
    SLEEP: 'sleep',
    WAKE: 'wake',
    MEAL: 'meal',
    WORK: 'work',
    THERAPY: 'therapy',
    RECREATION: 'recreation',
    FREE: 'free time',
    NIGHT_DUTY: 'night duty',
    PATROL: 'patrol',
    RESEARCH: 'research'
};

// ==========================================
// CHARACTER ARCHETYPES DATABASE (50+ Characters)
// ==========================================

const PATIENT_ARCHETYPES = [
    {
        id: 'paranoid_schizo',
        name: 'The Paranoid',
        description: 'Already believes they\'re being watched. Makes them susceptible but unpredictable.',
        baseSanity: 40,
        sanityDecay: 1.5,
        fears: ['ghosts', 'demons', 'unknown', 'crowds'],
        traits: ['paranoid', 'delusional', 'agitated'],
        susceptibility: { haunting: 1.5, possession: 0.8, illusion: 2.0 }
    },
    {
        id: 'depressive_insomniac',
        name: 'The Depressive',
        description: 'Haunted by their own mind. Easy target for nightmare attacks.',
        baseSanity: 50,
        sanityDecay: 1.2,
        fears: ['solitude', 'darkness', 'death', 'mirrors'],
        traits: ['depressed', 'insomniac', 'withdrawn'],
        susceptibility: { haunting: 1.2, possession: 1.0, nightmare: 2.5 }
    },
    {
        id: 'violent_psychopath',
        name: 'The Violent One',
        description: 'Dangerous and unpredictable. High resistance but can cause chaos.',
        baseSanity: 70,
        sanityDecay: 0.8,
        fears: ['confined', 'needles', 'fire'],
        traits: ['violent', 'aggressive', 'cunning'],
        susceptibility: { haunting: 0.6, possession: 1.3, corruption: 1.5 }
    },
    {
        id: 'ptsd_soldier',
        name: 'The Veteran',
        description: 'Former soldier with severe PTSD. Jumps at shadows, loud noises.',
        baseSanity: 45,
        sanityDecay: 1.3,
        fears: ['loud noises', 'blood', 'fire', 'crowds', 'darkness'],
        traits: ['jumpy', 'flashbacks', 'hypervigilant'],
        susceptibility: { haunting: 1.8, possession: 0.9, poltergeist: 2.0 }
    },
    {
        id: 'ocd_perfectionist',
        name: 'The Perfectionist',
        description: 'Obsessive compulsive. Moving objects causes extreme distress.',
        baseSanity: 60,
        sanityDecay: 1.0,
        fears: ['disorder', 'dirt', 'germs', 'unknown'],
        traits: ['obsessive', 'ritualistic', 'rigid'],
        susceptibility: { haunting: 1.4, possession: 0.7, poltergeist: 2.5 }
    },
    {
        id: 'dissociative_identity',
        name: 'The Multiple',
        description: 'Multiple personalities. Each reacts differently to fear.',
        baseSanity: 55,
        sanityDecay: 1.1,
        fears: ['mirrors', 'unknown', 'solitude'],
        traits: ['unpredictable', 'fragmented', 'variable'],
        susceptibility: { haunting: 1.3, possession: 1.5, illusion: 1.8 }
    },
    {
        id: 'religious_fanatic',
        name: 'The Zealot',
        description: 'Believes demons are real. Religious symbols may help or hurt.',
        baseSanity: 65,
        sanityDecay: 0.9,
        fears: ['demons', 'hell', 'sin', 'unknown'],
        traits: ['devout', 'judgmental', 'prophetic'],
        susceptibility: { haunting: 2.0, possession: 2.0, corruption: 1.5 }
    },
    {
        id: 'addict_junkie',
        name: 'The Addict',
        description: 'Drug-dependent. Withdrawal makes them see things anyway.',
        baseSanity: 35,
        sanityDecay: 1.6,
        fears: ['pain', 'withdrawal', 'solitude', 'unknown'],
        traits: ['desperate', 'unpredictable', 'seeking'],
        susceptibility: { haunting: 1.4, possession: 1.2, nightmare: 1.8 }
    },
    {
        id: 'sociopath_manipulator',
        name: 'The Manipulator',
        description: 'Charming but dangerous. May try to use the haunting.',
        baseSanity: 80,
        sanityDecay: 0.6,
        fears: ['exposure', 'loss of control', 'solitude'],
        traits: ['charming', 'manipulative', 'cold'],
        susceptibility: { haunting: 0.5, possession: 1.8, corruption: 2.0 }
    },
    {
        id: 'catatonic_stare',
        name: 'The Catatonic',
        description: 'Barely responsive. Deep well of suppressed fear.',
        baseSanity: 30,
        sanityDecay: 0.4,
        fears: ['unknown', 'trapped', 'eternity'],
        traits: ['unresponsive', 'frozen', 'deep'],
        susceptibility: { haunting: 0.8, possession: 0.5, nightmare: 3.0 }
    },
    {
        id: 'eating_disorder',
        name: 'The Starving',
        description: 'Body dysmorphia. Mirrors are their enemy.',
        baseSanity: 50,
        sanityDecay: 1.1,
        fears: ['mirrors', 'food', 'judgment', 'crowds'],
        traits: ['frail', 'secretive', 'self-loathing'],
        susceptibility: { haunting: 1.3, possession: 1.0, illusion: 2.2 }
    },
    {
        id: 'pyromaniac',
        name: 'The Firestarter',
        description: 'Obsessed with flames. Fire-based hauntings thrill them.',
        baseSanity: 55,
        sanityDecay: 1.0,
        fears: ['water', 'extinguishment', 'confined'],
        traits: ['fascinated', 'destructive', 'euphoric'],
        susceptibility: { haunting: 0.7, possession: 1.1, corruption: 1.8 }
    },
    {
        id: 'autistic_savant',
        name: 'The Savant',
        description: 'Brilliant but overwhelmed. Patterns comfort them.',
        baseSanity: 60,
        sanityDecay: 0.9,
        fears: ['change', 'loud noises', 'crowds', 'unknown'],
        traits: ['brilliant', 'sensitive', 'routine-bound'],
        susceptibility: { haunting: 1.6, possession: 0.6, poltergeist: 2.0 }
    },
    {
        id: 'hysterical_mother',
        name: 'The Grieving Mother',
        description: 'Lost her child. Attracted to lullaby-like sounds.',
        baseSanity: 40,
        sanityDecay: 1.3,
        fears: ['children crying', 'loss', 'solitude', 'unknown'],
        traits: ['grieving', 'hysterical', 'searching'],
        susceptibility: { haunting: 2.0, possession: 1.1, illusion: 2.5 }
    },
    {
        id: 'dementia_elderly',
        name: 'The Forgotten',
        description: 'Elderly with dementia. Reality is already slipping.',
        baseSanity: 25,
        sanityDecay: 0.7,
        fears: ['unknown', 'strangers', 'confusion', 'solitude'],
        traits: ['confused', 'fearful', 'childlike'],
        susceptibility: { haunting: 1.2, possession: 0.4, nightmare: 1.5 }
    },
    {
        id: 'phobia_collection',
        name: 'The Phobic',
        description: 'Multiple severe phobias. Fear response is extreme.',
        baseSanity: 35,
        sanityDecay: 1.4,
        fears: ['spiders', 'snakes', 'heights', 'confined', 'open spaces', 'germs'],
        traits: ['terrified', 'avoidant', 'panic-prone'],
        susceptibility: { haunting: 2.5, possession: 0.9, illusion: 2.0 }
    },
    {
        id: 'stalker_obsessive',
        name: 'The Obsessed',
        description: 'Fixated on another patient. Will follow them anywhere.',
        baseSanity: 50,
        sanityDecay: 1.1,
        fears: ['rejection', 'loss', 'unknown'],
        traits: ['obsessive', 'following', 'intense'],
        susceptibility: { haunting: 1.3, possession: 1.4, corruption: 1.6 }
    },
    {
        id: 'amnesiac_lost',
        name: 'The Amnesiac',
        description: 'No memory of who they were. Terrified of their own past.',
        baseSanity: 45,
        sanityDecay: 1.2,
        fears: ['unknown', 'mirrors', 'triggers', 'solitude'],
        traits: ['lost', 'curious', 'fearful'],
        susceptibility: { haunting: 1.5, possession: 1.0, illusion: 1.9 }
    },
    {
        id: 'conversion_disorder',
        name: 'The Converted',
        description: 'Psychosomatic paralysis. Stress manifests physically.',
        baseSanity: 55,
        sanityDecay: 1.0,
        fears: ['paralysis', 'trapped', 'helplessness'],
        traits: ['fragile', 'physical', 'stressed'],
        susceptibility: { haunting: 1.6, possession: 0.8, nightmare: 2.2 }
    },
    {
        id: 'narcissist_elite',
        name: 'The Elite',
        description: 'Rich, entitled. Believes they\'re above this place.',
        baseSanity: 75,
        sanityDecay: 0.7,
        fears: ['loss of status', 'humiliation', 'common people'],
        traits: ['arrogant', 'demanding', 'fragile-ego'],
        susceptibility: { haunting: 0.8, possession: 1.3, corruption: 2.0 }
    },
    {
        id: 'self_harmer',
        name: 'The Cutter',
        description: 'Physical pain blocks emotional pain. Blood fascinates them.',
        baseSanity: 40,
        sanityDecay: 1.3,
        fears: ['emotional pain', 'abandonment', 'genuine care'],
        traits: ['damaged', 'seeking', 'numb'],
        susceptibility: { haunting: 1.4, possession: 1.1, corruption: 1.7 }
    },
    {
        id: 'capgras_delusion',
        name: 'The Doubter',
        description: 'Believes loved ones have been replaced by impostors.',
        baseSanity: 45,
        sanityDecay: 1.2,
        fears: ['impostors', 'unknown', 'trust'],
        traits: ['suspicious', 'delusional', 'isolated'],
        susceptibility: { haunting: 1.7, possession: 1.5, illusion: 2.5 }
    },
    {
        id: 'lycanthropy',
        name: 'The Wolf',
        description: 'Believes they transform into a wolf. May become feral.',
        baseSanity: 50,
        sanityDecay: 1.0,
        fears: ['moon', 'silver', 'cages', 'hunters'],
        traits: ['feral', 'instinctive', 'wild'],
        susceptibility: { haunting: 1.2, possession: 1.4, nightmare: 2.0 }
    },
    {
        id: 'cult_survivor',
        name: 'The Survivor',
        description: 'Escaped a cult. Religious hauntings trigger trauma.',
        baseSanity: 40,
        sanityDecay: 1.3,
        fears: ['cults', 'rituals', 'symbols', 'groups'],
        traits: ['traumatized', 'wary', 'independent'],
        susceptibility: { haunting: 1.9, possession: 0.8, corruption: 2.2 }
    },
    {
        id: 'transference',
        name: 'The Projector',
        description: 'Projects feelings onto others. May "see" things in others.',
        baseSanity: 55,
        sanityDecay: 1.0,
        fears: ['intimacy', 'truth', 'self'],
        traits: ['projecting', 'blaming', 'unaware'],
        susceptibility: { haunting: 1.3, possession: 1.2, illusion: 1.8 }
    }
];

const STAFF_ARCHETYPES = [
    {
        id: 'head_psychiatrist',
        name: 'Head Psychiatrist',
        description: 'Runs the facility. Highly educated, skeptical.',
        type: 'medical',
        baseSanity: 85,
        authority: 5,
        fears: ['failure', 'scandal', 'unknown'],
        schedule: [SCHEDULE_ACTIVITIES.WORK, SCHEDULE_ACTIVITIES.THERAPY, SCHEDULE_ACTIVITIES.OFFICE],
        susceptibility: { haunting: 0.4, possession: 0.6, illusion: 0.5 }
    },
    {
        id: 'nurse_veteran',
        name: 'Veteran Nurse',
        description: 'Seen it all. Hard to scare but notices everything.',
        type: 'medical',
        baseSanity: 80,
        authority: 3,
        fears: ['losing patients', 'violence', 'failure'],
        schedule: [SCHEDULE_ACTIVITIES.WORK, SCHEDULE_ACTIVITIES.PATROL, SCHEDULE_ACTIVITIES.NIGHT_DUTY],
        susceptibility: { haunting: 0.6, possession: 0.7, illusion: 0.6 }
    },
    {
        id: 'night_nurse',
        name: 'Night Nurse',
        description: 'Works alone at night. Jumps at sounds.',
        type: 'medical',
        baseSanity: 60,
        authority: 2,
        fears: ['darkness', 'alone', 'ghosts', 'sudden death'],
        schedule: [SCHEDULE_ACTIVITIES.NIGHT_DUTY, SCHEDULE_ACTIVITIES.PATROL],
        susceptibility: { haunting: 1.3, possession: 0.9, illusion: 1.4 }
    },
    {
        id: 'security_chief',
        name: 'Security Chief',
        description: 'Ex-military. Skeptical but observant.',
        type: 'security',
        baseSanity: 75,
        authority: 4,
        fears: ['breach', 'failure', 'unknown threat'],
        schedule: [SCHEDULE_ACTIVITIES.PATROL, SCHEDULE_ACTIVITIES.OFFICE, SCHEDULE_ACTIVITIES.NIGHT_DUTY],
        susceptibility: { haunting: 0.5, possession: 0.8, illusion: 0.4 }
    },
    {
        id: 'security_guard',
        name: 'Security Guard',
        description: 'Basic security. Bored, underpaid, easily distracted.',
        type: 'security',
        baseSanity: 65,
        authority: 2,
        fears: ['violence', 'losing job', 'supernatural'],
        schedule: [SCHEDULE_ACTIVITIES.PATROL, SCHEDULE_ACTIVITIES.NIGHT_DUTY],
        susceptibility: { haunting: 0.9, possession: 1.0, illusion: 0.8 }
    },
    {
        id: 'orderly_brutal',
        name: 'Brutal Orderly',
        description: 'Enjoys the power. Cruel to patients.',
        type: 'orderly',
        baseSanity: 70,
        authority: 2,
        fears: ['exposure', 'revenge', 'loss of power'],
        schedule: [SCHEDULE_ACTIVITIES.PATROL, SCHEDULE_ACTIVITIES.RESTRAINT],
        susceptibility: { haunting: 0.8, possession: 1.2, corruption: 1.5 }
    },
    {
        id: 'orderly_kind',
        name: 'Kind Orderly',
        description: 'Genuinely cares. Vulnerable to guilt.',
        type: 'orderly',
        baseSanity: 75,
        authority: 2,
        fears: ['patient harm', 'guilt', 'helplessness'],
        schedule: [SCHEDULE_ACTIVITIES.PATROL, SCHEDULE_ACTIVITIES.ASSIST],
        susceptibility: { haunting: 1.1, possession: 0.9, illusion: 1.2 }
    },
    {
        id: 'janitor_lonely',
        name: 'The Janitor',
        description: 'Invisible to others. Knows every corner.',
        type: 'maintenance',
        baseSanity: 65,
        authority: 1,
        fears: ['invisibility', 'darkness', 'being replaced'],
        schedule: [SCHEDULE_ACTIVITIES.WORK, SCHEDULE_ACTIVITIES.NIGHT_DUTY],
        susceptibility: { haunting: 1.2, possession: 1.1, poltergeist: 1.5 }
    },
    {
        id: 'maintenance_worker',
        name: 'Maintenance Worker',
        description: 'Fixes things. Hears noises others don\'t.',
        type: 'maintenance',
        baseSanity: 70,
        authority: 1,
        fears: ['machinery', 'electrical', 'basements'],
        schedule: [SCHEDULE_ACTIVITIES.WORK, SCHEDULE_ACTIVITIES.REPAIR],
        susceptibility: { haunting: 0.9, possession: 0.8, poltergeist: 2.0 }
    },
    {
        id: 'cook_institutional',
        name: 'Institutional Cook',
        description: 'Feeds the masses. Dreams of better food.',
        type: 'service',
        baseSanity: 75,
        authority: 1,
        fears: ['contamination', 'rats', 'fire'],
        schedule: [SCHEDULE_ACTIVITIES.MEAL, SCHEDULE_ACTIVITIES.PREP],
        susceptibility: { haunting: 0.7, possession: 0.9, corruption: 0.8 }
    },
    {
        id: 'therapist_art',
        name: 'Art Therapist',
        description: 'Uses creativity to heal. Sensitive to atmosphere.',
        type: 'therapy',
        baseSanity: 70,
        authority: 2,
        fears: ['creative block', 'patient suicide', 'darkness'],
        schedule: [SCHEDULE_ACTIVITIES.THERAPY, SCHEDULE_ACTIVITIES.WORK],
        susceptibility: { haunting: 1.3, possession: 1.0, illusion: 1.6 }
    },
    {
        id: 'therapist_group',
        name: 'Group Therapist',
        description: 'Leads group sessions. Reads the room well.',
        type: 'therapy',
        baseSanity: 75,
        authority: 2,
        fears: ['group breakdown', 'violence', 'failure'],
        schedule: [SCHEDULE_ACTIVITIES.THERAPY, SCHEDULE_ACTIVITIES.WORK],
        susceptibility: { haunting: 0.8, possession: 0.9, illusion: 1.1 }
    },
    {
        id: 'pharmacist',
        name: 'Pharmacist',
        description: 'Controls the drugs. Precise and careful.',
        type: 'medical',
        baseSanity: 80,
        authority: 2,
        fears: ['medication errors', 'theft', 'contamination'],
        schedule: [SCHEDULE_ACTIVITIES.WORK, SCHEDULE_ACTIVITIES.DISPENSE],
        susceptibility: { haunting: 0.5, possession: 0.7, corruption: 0.6 }
    },
    {
        id: 'receptionist',
        name: 'Receptionist',
        description: 'First face visitors see. Gossipy and observant.',
        type: 'admin',
        baseSanity: 70,
        authority: 1,
        fears: ['scandal', 'unknown visitors', 'phone calls'],
        schedule: [SCHEDULE_ACTIVITIES.WORK, SCHEDULE_ACTIVITIES.OFFICE],
        susceptibility: { haunting: 0.9, possession: 1.0, illusion: 1.0 }
    },
    {
        id: 'social_worker',
        name: 'Social Worker',
        description: 'Fights for patients. Burned out but dedicated.',
        type: 'therapy',
        baseSanity: 65,
        authority: 2,
        fears: ['system failure', 'patient harm', 'bureaucracy'],
        schedule: [SCHEDULE_ACTIVITIES.WORK, SCHEDULE_ACTIVITIES.THERAPY],
        susceptibility: { haunting: 1.0, possession: 1.1, corruption: 1.2 }
    }
];

const INVESTIGATOR_ARCHETYPES = [
    {
        id: 'paranormal_hunter',
        name: 'Paranormal Hunter',
        description: 'Believes in ghosts. Armed with EMF meters and cameras.',
        type: 'believer',
        baseSanity: 70,
        detection: 3,
        equipment: ['EMF meter', 'spirit box', 'thermal camera', 'EVP recorder'],
        fears: ['being wrong', 'possession', 'the unknown'],
        susceptibility: { haunting: 0.7, possession: 0.5, detection: 2.0 }
    },
    {
        id: 'skeptic_scientist',
        name: 'Skeptical Scientist',
        description: 'Seeks rational explanations. Harder to scare but methodical.',
        type: 'skeptic',
        baseSanity: 90,
        detection: 2,
        equipment: ['recording equipment', 'environmental sensors', 'laptop'],
        fears: ['professional humiliation', 'being fooled', 'irrationality'],
        susceptibility: { haunting: 0.3, possession: 0.4, detection: 1.5 }
    },
    {
        id: 'psychic_medium',
        name: 'Psychic Medium',
        description: 'Claims to communicate with spirits. Actually can sense you.',
        type: 'sensitive',
        baseSanity: 60,
        detection: 4,
        equipment: ['crystal', 'tarot cards', 'sage'],
        fears: ['being overwhelmed', 'evil entities', 'losing control'],
        susceptibility: { haunting: 1.5, possession: 0.3, detection: 3.0 }
    },
    {
        id: 'priest_exorcist',
        name: 'Exorcist Priest',
        description: 'Man of faith. Can banish you if suspicion gets too high.',
        type: 'holy',
        baseSanity: 85,
        detection: 3,
        equipment: ['holy water', 'crucifix', 'bible', 'salt'],
        fears: ['losing faith', 'defeat', 'damnation'],
        susceptibility: { haunting: 0.5, possession: 0.2, corruption: 0.3 }
    },
    {
        id: 'journalist_investigator',
        name: 'Investigative Journalist',
        description: 'Looking for a story. Quick to publish findings.',
        type: 'media',
        baseSanity: 75,
        detection: 2,
        equipment: ['camera', 'voice recorder', 'notebook'],
        fears: ['missing the story', 'danger', 'being silenced'],
        susceptibility: { haunting: 0.8, possession: 0.9, suspicion: 2.0 }
    },
    {
        id: 'occultist_hobbyist',
        name: 'Occult Enthusiast',
        description: 'Amateur occultist. Might accidentally help or hinder.',
        type: 'amateur',
        baseSanity: 65,
        detection: 2,
        equipment: ['occult books', 'pendulum', 'candles'],
        fears: ['summoning something worse', 'being laughed at', 'real magic'],
        susceptibility: { haunting: 1.0, possession: 1.2, corruption: 1.5 }
    }
];

// ==========================================
// ASYLUM LAYOUTS (10 Different Maps)
// ==========================================

const ASYLUM_LAYOUTS = [
    // Layout 0: Victorian Manor
    {
        name: 'Blackwood Manor',
        floors: 4,
        width: 24,
        height: 18,
        rooms: [
            { id: 'entrance', type: 'CORRIDOR', x: 10, y: 16, w: 4, h: 2, floor: 0 },
            { id: 'lobby', type: 'COMMON', x: 8, y: 12, w: 8, h: 4, floor: 0 },
            { id: 'main_hall', type: 'CORRIDOR', x: 11, y: 4, w: 2, h: 8, floor: 0 },
            { id: 'dining', type: 'DINING', x: 4, y: 6, w: 6, h: 5, floor: 0 },
            { id: 'kitchen', type: 'STORAGE', x: 2, y: 12, w: 5, h: 4, floor: 0 },
            { id: 'library', type: 'OFFICE', x: 14, y: 6, w: 5, h: 5, floor: 0 },
            { id: 'parlor', type: 'COMMON', x: 19, y: 8, w: 4, h: 4, floor: 0 },
            { id: 'chapel', type: 'CHAPEL', x: 2, y: 2, w: 6, h: 4, floor: 0 },
            { id: 'cell_e1', type: 'CELL', x: 2, y: 8, w: 3, h: 3, floor: 1 },
            { id: 'cell_e2', type: 'CELL', x: 2, y: 12, w: 3, h: 3, floor: 1 },
            { id: 'cell_e3', type: 'CELL', x: 6, y: 8, w: 3, h: 3, floor: 1 },
            { id: 'cell_e4', type: 'CELL', x: 6, y: 12, w: 3, h: 3, floor: 1 },
            { id: 'cell_w1', type: 'CELL', x: 15, y: 8, w: 3, h: 3, floor: 1 },
            { id: 'cell_w2', type: 'CELL', x: 15, y: 12, w: 3, h: 3, floor: 1 },
            { id: 'cell_w3', type: 'CELL', x: 19, y: 8, w: 3, h: 3, floor: 1 },
            { id: 'cell_w4', type: 'CELL', x: 19, y: 12, w: 3, h: 3, floor: 1 },
            { id: 'hall_1f', type: 'CORRIDOR', x: 5, y: 6, w: 14, h: 2, floor: 1 },
            { id: 'nurse_station', type: 'OFFICE', x: 10, y: 4, w: 4, h: 4, floor: 1 },
            { id: 'cell_e5', type: 'CELL', x: 2, y: 8, w: 3, h: 3, floor: 2 },
            { id: 'cell_e6', type: 'CELL', x: 2, y: 12, w: 3, h: 3, floor: 2 },
            { id: 'cell_e7', type: 'CELL', x: 6, y: 8, w: 3, h: 3, floor: 2 },
            { id: 'cell_e8', type: 'CELL', x: 6, y: 12, w: 3, h: 3, floor: 2 },
            { id: 'cell_w5', type: 'CELL', x: 15, y: 8, w: 3, h: 3, floor: 2 },
            { id: 'cell_w6', type: 'CELL', x: 15, y: 12, w: 3, h: 3, floor: 2 },
            { id: 'cell_w7', type: 'CELL', x: 19, y: 8, w: 3, h: 3, floor: 2 },
            { id: 'cell_w8', type: 'CELL', x: 19, y: 12, w: 3, h: 3, floor: 2 },
            { id: 'hall_2f', type: 'CORRIDOR', x: 5, y: 6, w: 14, h: 2, floor: 2 },
            { id: 'doctors_office', type: 'OFFICE', x: 10, y: 4, w: 4, h: 4, floor: 2 },
            { id: 'attic_storage', type: 'STORAGE', x: 3, y: 3, w: 8, h: 5, floor: 3 },
            { id: 'attic_rooms', type: 'CELL', x: 13, y: 3, w: 8, h: 5, floor: 3 },
            { id: 'tower_room', type: 'ISOLATION', x: 20, y: 2, w: 3, h: 3, floor: 3 },
            { id: 'basement_storage', type: 'STORAGE', x: 3, y: 6, w: 8, h: 6, floor: -1 },
            { id: 'furnace_room', type: 'BASEMENT', x: 13, y: 6, w: 6, h: 6, floor: -1 },
            { id: 'old_lab', type: 'LAB', x: 2, y: 2, w: 6, h: 4, floor: -1 }
        ]
    },
    // Layout 1: Modern Facility
    {
        name: 'Serenity Heights',
        floors: 3,
        width: 28,
        height: 20,
        rooms: [
            { id: 'reception', type: 'COMMON', x: 11, y: 16, w: 6, h: 3, floor: 0 },
            { id: 'main_corridor', type: 'CORRIDOR', x: 13, y: 4, w: 2, h: 12, floor: 0 },
            { id: 'cafe', type: 'DINING', x: 4, y: 12, w: 8, h: 5, floor: 0 },
            { id: 'activity_room', type: 'COMMON', x: 16, y: 12, w: 8, h: 5, floor: 0 },
            { id: 'therapy_suite', type: 'OFFICE', x: 4, y: 4, w: 8, h: 6, floor: 0 },
            { id: 'admin_office', type: 'OFFICE', x: 16, y: 4, w: 8, h: 6, floor: 0 },
            { id: 'garden_access', type: 'GARDEN', x: 2, y: 14, w: 4, h: 4, floor: 0 },
            { id: 'security_hub', type: 'SECURITY', x: 24, y: 4, w: 3, h: 4, floor: 0 },
            { id: 'pharmacy', type: 'INFIRMARY', x: 2, y: 8, w: 5, h: 4, floor: 0 },
            { id: 'ward_a', type: 'CELL', x: 2, y: 4, w: 10, h: 8, floor: 1 },
            { id: 'ward_b', type: 'CELL', x: 16, y: 4, w: 10, h: 8, floor: 1 },
            { id: 'nursing_station_1', type: 'OFFICE', x: 12, y: 4, w: 4, h: 4, floor: 1 },
            { id: 'exam_room', type: 'INFIRMARY', x: 2, y: 14, w: 6, h: 4, floor: 1 },
            { id: 'quiet_room', type: 'ISOLATION', x: 20, y: 14, w: 4, h: 4, floor: 1 },
            { id: 'ward_c', type: 'CELL', x: 2, y: 4, w: 10, h: 8, floor: 2 },
            { id: 'ward_d', type: 'CELL', x: 16, y: 4, w: 10, h: 8, floor: 2 },
            { id: 'nursing_station_2', type: 'OFFICE', x: 12, y: 4, w: 4, h: 4, floor: 2 },
            { id: 'group_therapy', type: 'COMMON', x: 2, y: 14, w: 8, h: 4, floor: 2 },
            { id: 'art_therapy', type: 'COMMON', x: 12, y: 14, w: 6, h: 4, floor: 2 },
            { id: 'rooftop_garden', type: 'GARDEN', x: 20, y: 14, w: 6, h: 4, floor: 2 }
        ]
    },
    // Layout 2: Abandoned Wing
    {
        name: 'Forgotten Wing',
        floors: 2,
        width: 32,
        height: 24,
        rooms: [
            { id: 'broken_entrance', type: 'CORRIDOR', x: 14, y: 20, w: 4, h: 3, floor: 0 },
            { id: 'collapsed_lobby', type: 'COMMON', x: 8, y: 14, w: 16, h: 6, floor: 0 },
            { id: 'dusty_corridor_e', type: 'CORRIDOR', x: 4, y: 6, w: 10, h: 2, floor: 0 },
            { id: 'dusty_corridor_w', type: 'CORRIDOR', x: 18, y: 6, w: 10, h: 2, floor: 0 },
            { id: 'rusted_cells_1', type: 'CELL', x: 2, y: 2, w: 4, h: 4, floor: 0 },
            { id: 'rusted_cells_2', type: 'CELL', x: 8, y: 2, w: 4, h: 4, floor: 0 },
            { id: 'rusted_cells_3', type: 'CELL', x: 20, y: 2, w: 4, h: 4, floor: 0 },
            { id: 'rusted_cells_4', type: 'CELL', x: 26, y: 2, w: 4, h: 4, floor: 0 },
            { id: 'shattered_chapel', type: 'CHAPEL', x: 2, y: 10, w: 8, h: 6, floor: 0 },
            { id: 'moldy_kitchen', type: 'STORAGE', x: 22, y: 10, w: 8, h: 6, floor: 0 },
            { id: 'overgrown_courtyard', type: 'GARDEN', x: 12, y: 10, w: 8, h: 4, floor: 0 },
            { id: 'water_damage_1', type: 'BASEMENT', x: 2, y: 18, w: 8, h: 4, floor: 0 },
            { id: 'water_damage_2', type: 'BASEMENT', x: 22, y: 18, w: 8, h: 4, floor: 0 },
            { id: 'upper_east', type: 'CELL', x: 2, y: 4, w: 12, h: 6, floor: 1 },
            { id: 'upper_west', type: 'CELL', x: 18, y: 4, w: 12, h: 6, floor: 1 },
            { id: 'collapsed_floor', type: 'BASEMENT', x: 14, y: 8, w: 4, h: 8, floor: 1 },
            { id: 'tower_loom', type: 'ISOLATION', x: 28, y: 2, w: 3, h: 3, floor: 1 },
            { id: 'attic_crawl', type: 'STORAGE', x: 4, y: 2, w: 8, h: 3, floor: 1 }
        ]
    },
    // Layout 3: Underground Labs
    {
        name: 'Subterranean Labs',
        floors: 3,
        width: 26,
        height: 22,
        rooms: [
            { id: 'elevator_bank', type: 'CORRIDOR', x: 11, y: 18, w: 4, h: 3, floor: 0 },
            { id: 'main_lab', type: 'LAB', x: 4, y: 8, w: 10, h: 8, floor: 0 },
            { id: 'observation', type: 'OFFICE', x: 16, y: 8, w: 6, h: 6, floor: 0 },
            { id: 'containment_1', type: 'ISOLATION', x: 2, y: 4, w: 6, h: 6, floor: 0 },
            { id: 'containment_2', type: 'ISOLATION', x: 18, y: 4, w: 6, h: 6, floor: 0 },
            { id: 'specimen_storage', type: 'STORAGE', x: 2, y: 12, w: 6, h: 4, floor: 0 },
            { id: 'data_center', type: 'ELECTRICAL', x: 18, y: 16, w: 6, h: 4, floor: 0 },
            { id: 'lower_corridor', type: 'CORRIDOR', x: 4, y: 10, w: 18, h: 2, floor: -1 },
            { id: 'subject_cells_1', type: 'CELL', x: 2, y: 4, w: 8, h: 5, floor: -1 },
            { id: 'subject_cells_2', type: 'CELL', x: 16, y: 4, w: 8, h: 5, floor: -1 },
            { id: 'experimental_chamber', type: 'LAB', x: 10, y: 4, w: 6, h: 5, floor: -1 },
            { id: 'power_core', type: 'ELECTRICAL', x: 10, y: 14, w: 6, h: 4, floor: -1 },
            { id: 'maintenance_tunnel', type: 'CORRIDOR', x: 2, y: 16, w: 22, h: 2, floor: -1 },
            { id: 'deep_storage', type: 'STORAGE', x: 4, y: 4, w: 18, h: 6, floor: -2 },
            { id: 'old_sewers', type: 'BASEMENT', x: 2, y: 12, w: 10, h: 6, floor: -2 },
            { id: 'forbidden_vault', type: 'ISOLATION', x: 14, y: 12, w: 10, h: 6, floor: -2 }
        ]
    },
    // Layout 4: Coastal Asylum
    {
        name: 'Cape Fear Sanatorium',
        floors: 4,
        width: 30,
        height: 26,
        rooms: [
            { id: 'grand_entrance', type: 'COMMON', x: 12, y: 22, w: 6, h: 3, floor: 0 },
            { id: 'rotunda', type: 'CORRIDOR', x: 13, y: 10, w: 4, h: 10, floor: 0 },
            { id: 'east_wing', type: 'CELL', x: 2, y: 6, w: 10, h: 14, floor: 0 },
            { id: 'west_wing', type: 'CELL', x: 18, y: 6, w: 10, h: 14, floor: 0 },
            { id: 'dining_hall', type: 'DINING', x: 8, y: 2, w: 14, h: 6, floor: 0 },
            { id: 'kitchens', type: 'STORAGE', x: 2, y: 2, w: 5, h: 6, floor: 0 },
            { id: 'seaview_lounge', type: 'COMMON', x: 23, y: 2, w: 5, h: 6, floor: 0 },
            { id: 'administration', type: 'OFFICE', x: 12, y: 2, w: 6, h: 4, floor: 1 },
            { id: 'infirmary', type: 'INFIRMARY', x: 2, y: 2, w: 8, h: 6, floor: 1 },
            { id: 'therapy_rooms', type: 'OFFICE', x: 20, y: 2, w: 8, h: 6, floor: 1 },
            { id: 'upper_east', type: 'CELL', x: 2, y: 10, w: 10, h: 10, floor: 1 },
            { id: 'upper_west', type: 'CELL', x: 18, y: 10, w: 10, h: 10, floor: 1 },
            { id: 'isolation_cells', type: 'ISOLATION', x: 6, y: 6, w: 4, h: 4, floor: 2 },
            { id: 'tower_apartments', type: 'CELL', x: 2, y: 2, w: 6, h: 8, floor: 2 },
            { id: 'observatory', type: 'COMMON', x: 22, y: 2, w: 6, h: 6, floor: 2 },
            { id: 'attic_storage', type: 'STORAGE', x: 4, y: 4, w: 8, h: 6, floor: 3 },
            { id: 'bell_tower', type: 'CHAPEL', x: 20, y: 4, w: 6, h: 6, floor: 3 },
            { id: 'lighthouse_room', type: 'ISOLATION', x: 26, y: 2, w: 3, h: 3, floor: 3 },
            { id: 'boat_house', type: 'STORAGE', x: 2, y: 20, w: 6, h: 4, floor: -1 },
            { id: 'sea_caves', type: 'BASEMENT', x: 22, y: 18, w: 6, h: 6, floor: -1 }
        ]
    },
    // Layout 5: Mountain Retreat
    {
        name: 'High Peak Retreat',
        floors: 3,
        width: 28,
        height: 24,
        rooms: [
            { id: 'ski_lodge_entrance', type: 'COMMON', x: 10, y: 20, w: 8, h: 3, floor: 0 },
            { id: 'great_hall', type: 'COMMON', x: 6, y: 12, w: 16, h: 6, floor: 0 },
            { id: 'stone_fireplace', type: 'DINING', x: 4, y: 6, w: 8, h: 5, floor: 0 },
            { id: 'mountain_view', type: 'COMMON', x: 16, y: 6, w: 8, h: 5, floor: 0 },
            { id: 'ski_storage', type: 'STORAGE', x: 2, y: 10, w: 4, h: 6, floor: 0 },
            { id: 'healing_springs', type: 'INFIRMARY', x: 22, y: 8, w: 4, h: 6, floor: 0 },
            { id: 'chapel_peak', type: 'CHAPEL', x: 2, y: 2, w: 6, h: 6, floor: 0 },
            { id: 'patient_lodge_e', type: 'CELL', x: 2, y: 8, w: 10, h: 6, floor: 1 },
            { id: 'patient_lodge_w', type: 'CELL', x: 16, y: 8, w: 10, h: 6, floor: 1 },
            { id: 'medical_station', type: 'INFIRMARY', x: 12, y: 6, w: 4, h: 4, floor: 1 },
            { id: 'group_rooms', type: 'COMMON', x: 2, y: 2, w: 12, h: 5, floor: 1 },
            { id: 'private_offices', type: 'OFFICE', x: 16, y: 2, w: 10, h: 5, floor: 1 },
            { id: 'high_attic', type: 'STORAGE', x: 4, y: 4, w: 8, h: 6, floor: 2 },
            { id: 'observation_deck', type: 'COMMON', x: 16, y: 4, w: 8, h: 6, floor: 2 },
            { id: 'storm_shelter', type: 'BASEMENT', x: 6, y: 12, w: 8, h: 6, floor: -1 },
            { id: 'equipment_bay', type: 'STORAGE', x: 16, y: 12, w: 8, h: 6, floor: -1 }
        ]
    },
    // Layout 6: Urban Hospital
    {
        name: 'Metropolitan Psychiatric',
        floors: 5,
        width: 24,
        height: 20,
        rooms: [
            { id: 'emergency', type: 'INFIRMARY', x: 2, y: 16, w: 6, h: 3, floor: 0 },
            { id: 'admissions', type: 'OFFICE', x: 9, y: 16, w: 6, h: 3, floor: 0 },
            { id: 'lobby', type: 'COMMON', x: 16, y: 14, w: 6, h: 5, floor: 0 },
            { id: 'cafe', type: 'DINING', x: 2, y: 10, w: 8, h: 5, floor: 0 },
            { id: 'pharmacy', type: 'INFIRMARY', x: 16, y: 8, w: 6, h: 5, floor: 0 },
            { id: 'gift_shop', type: 'COMMON', x: 2, y: 4, w: 6, h: 5, floor: 0 },
            { id: 'security_desk', type: 'SECURITY', x: 16, y: 2, w: 6, h: 5, floor: 0 },
            { id: 'ward_1', type: 'CELL', x: 2, y: 6, w: 10, h: 6, floor: 1 },
            { id: 'ward_2', type: 'CELL', x: 14, y: 6, w: 8, h: 6, floor: 1 },
            { id: 'nursing_1', type: 'OFFICE', x: 12, y: 4, w: 4, h: 4, floor: 1 },
            { id: 'ward_3', type: 'CELL', x: 2, y: 6, w: 10, h: 6, floor: 2 },
            { id: 'ward_4', type: 'CELL', x: 14, y: 6, w: 8, h: 6, floor: 2 },
            { id: 'nursing_2', type: 'OFFICE', x: 12, y: 4, w: 4, h: 4, floor: 2 },
            { id: 'icu', type: 'ISOLATION', x: 2, y: 4, w: 8, h: 6, floor: 3 },
            { id: 'high_security', type: 'ISOLATION', x: 14, y: 4, w: 8, h: 6, floor: 3 },
            { id: 'roof_garden', type: 'GARDEN', x: 4, y: 6, w: 8, h: 6, floor: 4 },
            { id: 'heli_pad', type: 'COMMON', x: 16, y: 6, w: 6, h: 6, floor: 4 },
            { id: 'morgue', type: 'BASEMENT', x: 4, y: 8, w: 8, h: 6, floor: -1 },
            { id: 'boiler_room', type: 'ELECTRICAL', x: 14, y: 8, w: 6, h: 6, floor: -1 }
        ]
    },
    // Layout 7: Rural Estate
    {
        name: 'Willow Creek Estate',
        floors: 3,
        width: 30,
        height: 26,
        rooms: [
            { id: 'porch', type: 'COMMON', x: 12, y: 22, w: 6, h: 3, floor: 0 },
            { id: 'foyer', type: 'CORRIDOR', x: 13, y: 18, w: 4, h: 4, floor: 0 },
            { id: 'drawing_room', type: 'COMMON', x: 4, y: 12, w: 10, h: 8, floor: 0 },
            { id: 'library', type: 'OFFICE', x: 16, y: 12, w: 10, h: 8, floor: 0 },
            { id: 'formal_dining', type: 'DINING', x: 4, y: 4, w: 10, h: 7, floor: 0 },
            { id: 'kitchen', type: 'STORAGE', x: 16, y: 4, w: 10, h: 7, floor: 0 },
            { id: 'conservatory', type: 'GARDEN', x: 2, y: 16, w: 8, h: 6, floor: 0 },
            { id: 'guest_rooms', type: 'CELL', x: 22, y: 16, w: 6, h: 6, floor: 0 },
            { id: 'master_suite', type: 'CELL', x: 4, y: 4, w: 8, h: 6, floor: 1 },
            { id: 'family_rooms', type: 'CELL', x: 14, y: 4, w: 12, h: 6, floor: 1 },
            { id: 'servant_quarters', type: 'CELL', x: 2, y: 12, w: 6, h: 6, floor: 1 },
            { id: 'study', type: 'OFFICE', x: 10, y: 12, w: 8, h: 6, floor: 1 },
            { id: 'nursery', type: 'COMMON', x: 20, y: 12, w: 8, h: 6, floor: 1 },
            { id: 'attic_bedrooms', type: 'CELL', x: 4, y: 6, w: 10, h: 6, floor: 2 },
            { id: 'storage_loft', type: 'STORAGE', x: 16, y: 6, w: 10, h: 6, floor: 2 },
            { id: 'root_cellar', type: 'BASEMENT', x: 8, y: 16, w: 8, h: 6, floor: -1 },
            { id: 'wine_cellar', type: 'STORAGE', x: 18, y: 16, w: 8, h: 6, floor: -1 },
            { id: 'barn_conversion', type: 'COMMON', x: 24, y: 2, w: 5, h: 8, floor: 0 }
        ]
    },
    // Layout 8: Industrial Complex
    {
        name: 'Foundry Psychiatric',
        floors: 3,
        width: 28,
        height: 22,
        rooms: [
            { id: 'factory_gate', type: 'SECURITY', x: 11, y: 18, w: 6, h: 3, floor: 0 },
            { id: 'assembly_floor', type: 'COMMON', x: 4, y: 8, w: 20, h: 8, floor: 0 },
            { id: 'machinery_bay', type: 'ELECTRICAL', x: 2, y: 4, w: 10, h: 6, floor: 0 },
            { id: 'foundry_pit', type: 'BASEMENT', x: 14, y: 4, w: 10, h: 6, floor: 0 },
            { id: 'locker_rooms', type: 'CELL', x: 2, y: 12, w: 6, h: 4, floor: 0 },
            { id: 'supervisor_office', type: 'OFFICE', x: 20, y: 12, w: 6, h: 4, floor: 0 },
            { id: 'break_room', type: 'DINING', x: 2, y: 18, w: 8, h: 3, floor: 0 },
            { id: 'upper_dorms', type: 'CELL', x: 4, y: 6, w: 20, h: 6, floor: 1 },
            { id: 'medical_bay', type: 'INFIRMARY', x: 2, y: 4, w: 6, h: 6, floor: 1 },
            { id: 'admin_loft', type: 'OFFICE', x: 20, y: 4, w: 6, h: 6, floor: 1 },
            { id: 'crane_cab', type: 'ISOLATION', x: 24, y: 2, w: 3, h: 3, floor: 2 },
            { id: 'tank_catwalk', type: 'CORRIDOR', x: 4, y: 2, w: 18, h: 3, floor: 2 },
            { id: 'sub_basement', type: 'BASEMENT', x: 6, y: 10, w: 16, h: 8, floor: -1 },
            { id: 'furnace_room', type: 'ELECTRICAL', x: 2, y: 8, w: 8, h: 6, floor: -1 },
            { id: 'storage_vault', type: 'STORAGE', x: 18, y: 8, w: 8, h: 6, floor: -1 }
        ]
    },
    // Layout 9: Cathedral Sanatorium
    {
        name: 'St. Michael\'s Sanatorium',
        floors: 4,
        width: 32,
        height: 28,
        rooms: [
            { id: 'cathedral_nave', type: 'CHAPEL', x: 8, y: 10, w: 16, h: 10, floor: 0 },
            { id: 'altar', type: 'CHAPEL', x: 14, y: 4, w: 4, h: 5, floor: 0 },
            { id: 'confessionals', type: 'COMMON', x: 4, y: 8, w: 3, h: 8, floor: 0 },
            { id: 'sacristy', type: 'STORAGE', x: 25, y: 8, w: 5, h: 6, floor: 0 },
            { id: 'cloister_walk', type: 'GARDEN', x: 2, y: 2, w: 28, h: 4, floor: 0 },
            { id: 'bell_tower_base', type: 'CORRIDOR', x: 28, y: 10, w: 3, h: 8, floor: 0 },
            { id: 'dormitory_east', type: 'CELL', x: 2, y: 8, w: 10, h: 8, floor: 1 },
            { id: 'dormitory_west', type: 'CELL', x: 20, y: 8, w: 10, h: 8, floor: 1 },
            { id: 'refectory', type: 'DINING', x: 2, y: 18, w: 12, h: 6, floor: 1 },
            { id: 'scriptorium', type: 'OFFICE', x: 18, y: 18, w: 12, h: 6, floor: 1 },
            { id: 'infirmary', type: 'INFIRMARY', x: 14, y: 4, w: 4, h: 6, floor: 1 },
            { id: 'monk_cells_upper', type: 'CELL', x: 4, y: 6, w: 10, h: 6, floor: 2 },
            { id: 'abbots_quarters', type: 'OFFICE', x: 18, y: 6, w: 10, h: 6, floor: 2 },
            { id: 'library_upper', type: 'OFFICE', x: 4, y: 14, w: 10, h: 6, floor: 2 },
            { id: 'prayer_cells', type: 'ISOLATION', x: 18, y: 14, w: 6, h: 6, floor: 2 },
            { id: 'tower_mid', type: 'COMMON', x: 26, y: 14, w: 4, h: 6, floor: 2 },
            { id: 'belfry', type: 'COMMON', x: 26, y: 6, w: 4, h: 6, floor: 3 },
            { id: 'spire_room', type: 'ISOLATION', x: 27, y: 2, w: 3, h: 3, floor: 3 },
            { id: 'catacombs', type: 'BASEMENT', x: 6, y: 10, w: 20, h: 10, floor: -1 },
            { id: 'relic_vault', type: 'STORAGE', x: 2, y: 10, w: 4, h: 10, floor: -1 },
            { id: 'forbidden_crypt', type: 'ISOLATION', x: 26, y: 10, w: 4, h: 10, floor: -1 }
        ]
    }
];

// ==========================================
// ABILITY TREE DEFINITIONS
// ==========================================

const ABILITY_BRANCHES = {
    poltergeist: {
        name: 'Poltergeist',
        icon: '👻',
        color: '#a855f7',
        description: 'Physical manipulation of objects and environment',
        abilities: [
            { id: 'p1', name: 'Flicker', icon: '💡', cost: 1, description: 'Make lights flicker', unlocks: ['p2'] },
            { id: 'p2', name: 'Whisper', icon: '💨', cost: 1, description: 'Disembodied whispers', unlocks: ['p3', 'p4'] },
            { id: 'p3', name: 'Door Slam', icon: '🚪', cost: 2, description: 'Slam doors shut', unlocks: ['p5'] },
            { id: 'p4', name: 'Object Move', icon: '📦', cost: 2, description: 'Move small objects', unlocks: ['p6'] },
            { id: 'p5', name: 'Footsteps', icon: '👣', cost: 2, description: 'Phantom footsteps', unlocks: ['p7'] },
            { id: 'p6', name: 'Throw', icon: '🎯', cost: 3, description: 'Throw objects at targets', unlocks: ['p8'] },
            { id: 'p7', name: 'Cold Spot', icon: '❄️', cost: 3, description: 'Create freezing areas', unlocks: ['p9'] },
            { id: 'p8', name: 'Shatter', icon: '💥', cost: 3, description: 'Break glass and ceramics', unlocks: ['p9'] },
            { id: 'p9', name: 'Earthquake', icon: '🌋', cost: 5, description: 'Minor tremors', unlocks: ['p10'] },
            { id: 'p10', name: 'Telekinesis', icon: '✋', cost: 5, description: 'Major object manipulation', unlocks: ['p11'] },
            { id: 'p11', name: 'Mass Hysteria', icon: '⚡', cost: 8, description: 'Chaos across entire floor', unlocks: [] }
        ]
    },
    illusion: {
        name: 'Illusion',
        icon: '👁️',
        color: '#10b981',
        description: 'Create false visions and alter perceptions',
        abilities: [
            { id: 'i1', name: 'Shadow', icon: '🌑', cost: 1, description: 'Cast moving shadows', unlocks: ['i2'] },
            { id: 'i2', name: 'Reflection', icon: '🪞', cost: 1, description: 'Distort mirrors', unlocks: ['i3', 'i4'] },
            { id: 'i3', name: 'Shape', icon: '👤', cost: 2, description: 'Brief humanoid shape', unlocks: ['i5'] },
            { id: 'i4', name: 'Voice Mimic', icon: '🗣️', cost: 2, description: 'Mimic known voices', unlocks: ['i6'] },
            { id: 'i5', name: 'Face', icon: '🎭', cost: 2, description: 'Show a face in darkness', unlocks: ['i7'] },
            { id: 'i6', name: 'Doppelganger', icon: '👥', cost: 3, description: 'Copy of a person', unlocks: ['i8'] },
            { id: 'i7', name: 'False Room', icon: '🏠', cost: 3, description: 'Alter room appearance', unlocks: ['i9'] },
            { id: 'i8', name: 'Time Loop', icon: '⏰', cost: 3, description: 'Repeat recent events', unlocks: ['i9'] },
            { id: 'i9', name: 'Mass Hallucination', icon: '💭', cost: 5, description: 'Multiple see same vision', unlocks: ['i10'] },
            { id: 'i10', name: 'Reality Bend', icon: '🌀', cost: 5, description: 'Warp local reality', unlocks: ['i11'] },
            { id: 'i11', name: 'Total Delusion', icon: '🔮', cost: 8, description: 'Permanent false reality', unlocks: [] }
        ]
    },
    possession: {
        name: 'Possession',
        icon: '👤',
        color: '#ef4444',
        description: 'Control humans and animals',
        abilities: [
            { id: 'pos1', name: 'Touch', icon: '✋', cost: 1, description: 'Sense through touch', unlocks: ['pos2'] },
            { id: 'pos2', name: 'Whisper', icon: '🌬️', cost: 1, description: 'Whisper in mind', unlocks: ['pos3', 'pos4'] },
            { id: 'pos3', name: 'Influence', icon: '💫', cost: 2, description: 'Nudge thoughts', unlocks: ['pos5'] },
            { id: 'pos4', name: 'Animal', icon: '🐀', cost: 2, description: 'Control small animals', unlocks: ['pos6'] },
            { id: 'pos5', name: 'Suggestion', icon: '💡', cost: 2, description: 'Implant ideas', unlocks: ['pos7'] },
            { id: 'pos6', name: 'Body Ride', icon: '🎢', cost: 3, description: 'Observe through eyes', unlocks: ['pos8'] },
            { id: 'pos7', name: 'Partial', icon: '🎭', cost: 3, description: 'Control one limb', unlocks: ['pos9'] },
            { id: 'pos8', name: 'Sleep Walk', icon: '😴', cost: 3, description: 'Control sleeping person', unlocks: ['pos9'] },
            { id: 'pos9', name: 'Full Possession', icon: '👻', cost: 5, description: 'Complete control', unlocks: ['pos10'] },
            { id: 'pos10', name: 'Chain', icon: '⛓️', cost: 5, description: 'Jump between bodies', unlocks: ['pos11'] },
            { id: 'pos11', name: 'Army', icon: '👥', cost: 8, description: 'Control multiple', unlocks: [] }
        ]
    },
    nightmare: {
        name: 'Nightmare',
        icon: '💀',
        color: '#7c3aed',
        description: 'Invade dreams and create sleeping terror',
        abilities: [
            { id: 'n1', name: 'Dream Sense', icon: '🌙', cost: 1, description: 'Sense sleeping minds', unlocks: ['n2'] },
            { id: 'n2', name: 'Sleep Touch', icon: '✨', cost: 1, description: 'Slight sleep influence', unlocks: ['n3', 'n4'] },
            { id: 'n3', name: 'Bad Dream', icon: '😰', cost: 2, description: 'Cause minor nightmare', unlocks: ['n5'] },
            { id: 'n4', name: 'Sleep Paralysis', icon: '😶', cost: 2, description: 'Immobilize in sleep', unlocks: ['n6'] },
            { id: 'n5', name: 'Recurring', icon: '🔁', cost: 2, description: 'Repeating nightmares', unlocks: ['n7'] },
            { id: 'n6', name: 'Sleep Walking', icon: '🚶', cost: 3, description: 'Force sleep walking', unlocks: ['n8'] },
            { id: 'n7', name: 'Fear Manifest', icon: '👹', cost: 3, description: 'Dream fears appear real', unlocks: ['n9'] },
            { id: 'n8', name: 'Shared Dream', icon: '🤝', cost: 3, description: 'Link multiple dreamers', unlocks: ['n9'] },
            { id: 'n9', name: 'Dream Realm', icon: '🌌', cost: 5, description: 'Create dream pocket', unlocks: ['n10'] },
            { id: 'n10', name: 'Coma', icon: '💤', cost: 5, description: 'Induce endless sleep', unlocks: ['n11'] },
            { id: 'n11', name: 'Nightmare King', icon: '👑', cost: 8, description: 'Rule all dreams', unlocks: [] }
        ]
    },
    corruption: {
        name: 'Corruption',
        icon: '☠️',
        color: '#f43f5e',
        description: 'Decay reality and spread supernatural taint',
        abilities: [
            { id: 'c1', name: 'Whisper', icon: '📢', cost: 1, description: 'Dark words in mind', unlocks: ['c2'] },
            { id: 'c2', name: 'Mold', icon: '🦠', cost: 1, description: 'Accelerate decay', unlocks: ['c3', 'c4'] },
            { id: 'c3', name: 'Stain', icon: '🩸', cost: 2, description: 'Blood that won\'t wash', unlocks: ['c5'] },
            { id: 'c4', name: 'Rot', icon: '💀', cost: 2, description: 'Decay organic matter', unlocks: ['c6'] },
            { id: 'c5', name: 'Taint', icon: '☣️', cost: 2, description: 'Corrupt objects', unlocks: ['c7'] },
            { id: 'c6', name: 'Insect Swarm', icon: '🦟', cost: 3, description: 'Summon vermin', unlocks: ['c8'] },
            { id: 'c7', name: 'Shadow Bleed', icon: '🌑', cost: 3, description: 'Darkness spreads', unlocks: ['c9'] },
            { id: 'c8', name: 'Madness Touch', icon: '🤪', cost: 3, description: 'Infect with insanity', unlocks: ['c9'] },
            { id: 'c9', name: 'Blight', icon: '🌑', cost: 5, description: 'Corrupt entire areas', unlocks: ['c10'] },
            { id: 'c10', name: 'Void Tear', icon: '🕳️', cost: 5, description: 'Open small rifts', unlocks: ['c11'] },
            { id: 'c11', name: 'Apocalypse', icon: '🔥', cost: 8, description: 'Total corruption', unlocks: [] }
        ]
    }
};

// ==========================================
// HAUNTING TYPES
// ==========================================

const HAUNTING_TYPES = {
    environmental: [
        { id: 'lights_flicker', name: 'Flickering Lights', icon: '💡', cost: 5, cooldown: 10, description: 'Cause lights to flicker erratically', effect: 'fear +5, suspicion +1' },
        { id: 'cold_spot', name: 'Cold Spot', icon: '❄️', cost: 8, cooldown: 15, description: 'Create an area of intense cold', effect: 'fear +10, slows movement' },
        { id: 'door_slam', name: 'Door Slam', icon: '🚪', cost: 10, cooldown: 20, description: 'Slam doors shut forcefully', effect: 'fear +15, traps target' },
        { id: 'footsteps', name: 'Phantom Steps', icon: '👣', cost: 6, cooldown: 12, description: 'Footsteps with no source', effect: 'fear +8, paranoia +10' },
        { id: 'whispers', name: 'Disembodied Whispers', icon: '💨', cost: 7, cooldown: 15, description: 'Voices speaking secrets', effect: 'sanity -5, fear +8' },
        { id: 'shadow_move', name: 'Moving Shadows', icon: '🌑', cost: 9, cooldown: 18, description: 'Shadows move independently', effect: 'fear +12, panic chance' }
    ],
    physical: [
        { id: 'object_move', name: 'Object Movement', icon: '📦', cost: 12, cooldown: 25, description: 'Move objects mysteriously', effect: 'fear +15, confusion' },
        { id: 'object_throw', name: 'Poltergeist Throw', icon: '🎯', cost: 18, cooldown: 30, description: 'Throw objects at targets', effect: 'fear +25, physical harm' },
        { id: 'write_message', name: 'Bloody Writing', icon: '✍️', cost: 15, cooldown: 40, description: 'Write messages in blood', effect: 'fear +30, trauma' },
        { id: 'furniture_drag', name: 'Dragging Furniture', icon: '🪑', cost: 20, cooldown: 35, description: 'Heavy furniture moves', effect: 'fear +35, mass panic' },
        { id: 'water_blood', name: 'Blood from Taps', icon: '🩸', cost: 16, cooldown: 45, description: 'Water runs as blood', effect: 'fear +25, horror' },
        { id: 'mirror_crack', name: 'Mirror Crack', icon: '🪞', cost: 14, cooldown: 30, description: 'Shatter mirrors', effect: 'fear +20, bad luck' }
    ],
    apparition: [
        { id: 'brief_manifest', name: 'Brief Manifestation', icon: '👻', cost: 20, cooldown: 30, description: 'Ghostly form appears briefly', effect: 'fear +40, witnesses' },
        { id: 'shadow_figure', name: 'Shadow Person', icon: '👤', cost: 15, cooldown: 25, description: 'Dark humanoid shape', effect: 'fear +30, paranoia' },
        { id: 'face_window', name: 'Face at Window', icon: '🪟', cost: 18, cooldown: 35, description: 'Pale face appears outside', effect: 'fear +35, isolation fear' },
        { id: 'reflection_ghost', name: 'Reflection Ghost', icon: '💀', cost: 22, cooldown: 40, description: 'Ghost appears in mirror', effect: 'fear +45, identity crisis' },
        { id: 'corner_stander', name: 'Corner Stander', icon: '🧍', cost: 25, cooldown: 45, description: 'Figure standing in corner', effect: 'fear +50, catatonia risk' },
        { id: 'bed_sitter', name: 'Bedside Sitter', icon: '🛏️', cost: 30, cooldown: 50, description: 'Ghost sits on bed', effect: 'fear +60, sleep trauma' }
    ],
    psychological: [
        { id: 'name_call', name: 'Whisper Name', icon: '🗣️', cost: 12, cooldown: 20, description: 'Whisper their name', effect: 'fear +20, personalization' },
        { id: 'secret_reveal', name: 'Reveal Secret', icon: '📜', cost: 25, cooldown: 60, description: 'Speak their hidden secrets', effect: 'fear +50, trust break' },
        { id: 'deceased_voice', name: 'Dead Loved One', icon: '💔', cost: 30, cooldown: 70, description: 'Voice of someone dead', effect: 'fear +60, grief trauma' },
        { id: 'future_whisper', name: 'Prophecy of Doom', icon: '🔮', cost: 22, cooldown: 50, description: 'Predict their death', effect: 'fear +45, obsession' },
        { id: 'laughter', name: 'Demonic Laughter', icon: '😈', cost: 15, cooldown: 25, description: 'Unearthly laughter', effect: 'fear +25, dread' },
        { id: 'crying', name: 'Ghostly Crying', icon: '😢', cost: 14, cooldown: 22, description: 'Sound of weeping', effect: 'fear +20, sadness' }
    ],
    possession: [
        { id: 'speak_through', name: 'Speak Through', icon: '🎭', cost: 35, cooldown: 60, description: 'Use their voice', effect: 'fear +70, identity loss' },
        { id: 'hand_control', name: 'Hand Control', icon: '✋', cost: 40, cooldown: 70, description: 'Move their hand', effect: 'fear +80, helplessness' },
        { id: 'forced_writing', name: 'Automatic Writing', icon: '✍️', cost: 45, cooldown: 80, description: 'Make them write messages', effect: 'fear +90, possession fear' },
        { id: 'full_possession', name: 'Full Possession', icon: '👹', cost: 60, cooldown: 120, description: 'Take complete control', effect: 'fear +100, witness terror' },
        { id: 'animal_possess', name: 'Animal Control', icon: '🐀', cost: 20, cooldown: 40, description: 'Control nearby animals', effect: 'fear +40, vermin horror' }
    ],
    nightmare: [
        { id: 'bad_dream', name: 'Bad Dream', icon: '😰', cost: 15, cooldown: 30, description: 'Disturb their sleep', effect: 'fear +25, fatigue' },
        { id: 'night_terror', name: 'Night Terror', icon: '😱', cost: 25, cooldown: 45, description: 'Intense fear dream', effect: 'fear +50, screaming' },
        { id: 'sleep_paralysis', name: 'Sleep Paralysis', icon: '😶', cost: 30, cooldown: 50, description: 'Awake but cannot move', effect: 'fear +70, dread' },
        { id: 'dream_invasion', name: 'Dream Invasion', icon: '🌌', cost: 40, cooldown: 70, description: 'Enter their dream', effect: 'fear +90, reality blur' },
        { id: 'wake_terror', name: 'Waking Terror', icon: '⚡', cost: 35, cooldown: 60, description: 'Dreams manifest awake', effect: 'fear +100, breakdown' }
    ]
};

// ==========================================
// ACHIEVEMENT DEFINITIONS
// ==========================================

const ACHIEVEMENTS = [
    { id: 'first_blood', name: 'First Blood', description: 'Cause your first mental breakdown', icon: '💔', condition: (g) => g.stats.breakdowns >= 1 },
    { id: 'fear_spreader', name: 'Fear Spreader', description: 'Have 10 people terrified simultaneously', icon: '😱', condition: (g) => g.getTerrifiedCount() >= 10 },
    { id: 'puppet_master', name: 'Puppet Master', description: 'Possess 5 people in one game', icon: '🎭', condition: (g) => g.stats.possessions >= 5 },
    { id: 'epidemic_starter', name: 'Patient Zero', description: 'Trigger a fear epidemic', icon: '☣️', condition: (g) => g.epidemicActive },
    { id: 'shadow_dweller', name: 'Shadow Dweller', description: 'Remain undetected for 10 minutes', icon: '🌑', condition: (g) => g.stats.undetectedTime >= 600 },
    { id: 'mind_breaker', name: 'Mind Breaker', description: 'Cause 10 mental breakdowns', icon: '💀', condition: (g) => g.stats.breakdowns >= 10 },
    { id: 'architect_fear', name: 'Architect of Fear', description: 'Unlock all abilities in one branch', icon: '🏗️', condition: (g) => g.hasCompleteBranch() },
    { id: 'ghost_god', name: 'Ghost God', description: 'Unlock every ability', icon: '👑', condition: (g) => g.hasAllAbilities() },
    { id: 'silent_killer', name: 'Silent Killer', description: 'Cause breakdown without raising suspicion above 25%', icon: '🗡️', condition: (g) => g.stats.silentBreakdowns >= 1 },
    { id: 'chain_reaction', name: 'Chain Reaction', description: 'Cause 5 chain fear reactions', icon: '⛓️', condition: (g) => g.stats.chainReactions >= 5 },
    { id: 'investigator_scare', name: 'Get Out!', description: 'Scare away an investigator', icon: '🏃', condition: (g) => g.stats.scaredInvestigators >= 1 },
    { id: 'sanity_vampire', name: 'Sanity Vampire', description: 'Drain 1000 total sanity', icon: '🧛', condition: (g) => g.stats.totalSanityDrained >= 1000 }
];

// ==========================================
// GAME STATE CLASS
// ==========================================

class GameState {
    constructor() {
        this.version = GAME_VERSION;
        this.difficulty = DIFFICULTY.NORMAL;
        this.gameTime = 0;
        this.dayNightCycle = 0;
        this.isDay = false;
        this.currentLayout = 0;
        this.currentFloor = 0;
        this.paused = false;
        this.gameOver = false;
        this.victory = false;
        
        // Ghost stats
        this.essence = 100;
        this.maxEssence = 100;
        this.suspicion = 0;
        this.maxSuspicion = 100;
        this.abilityPoints = 3;
        this.unlockedAbilities = new Set(['p1', 'i1', 'pos1', 'n1', 'c1']);
        
        // Game stats
        this.stats = {
            hauntings: 0,
            possessions: 0,
            breakdowns: 0,
            totalSanityDrained: 0,
            undetectedTime: 0,
            silentBreakdowns: 0,
            chainReactions: 0,
            scaredInvestigators: 0,
            fearEpidemics: 0,
            timePlayed: 0
        };
        
        // World state
        this.characters = [];
        this.rooms = [];
        this.fearNetwork = new Map();
        this.activeHauntings = [];
        this.epidemicActive = false;
        this.investigatorsPresent = false;
        
        // Ghost position
        this.ghostPosition = { x: 0, y: 0, floor: 0 };
        this.possessedTarget = null;
        
        // Visual state
        this.viewMode = 'normal';
        this.selectedCharacter = null;
        this.cameraOffset = { x: 0, y: 0 };
        this.zoom = 1.0;
        
        // Event log
        this.eventLog = [];
        this.maxLogEntries = 100;
        
        // Initialize
        this.init();
    }
    
    init() {
        this.generateCharacters();
        this.loadLayout(0);
        this.generateRelationships();
        this.logEvent('system', 'Welcome to Asylum Architect. You are the ghost. Haunt them all.');
        this.logEvent('tutorial', 'Select characters to view their fears. Use abilities to drain their sanity.');
    }
    
    // ==========================================
    // CHARACTER GENERATION
    // ==========================================
    
    generateCharacters() {
        const names = this.generateNames();
        let nameIndex = 0;
        
        // Generate 35 patients (various archetypes)
        for (let i = 0; i < 35; i++) {
            const archetype = GameUtils.randomChoice(PATIENT_ARCHETYPES);
            const character = this.createCharacter(archetype, names[nameIndex++], CHARACTER_TYPES.PATIENT);
            this.characters.push(character);
        }
        
        // Generate 15 staff
        for (let i = 0; i < 15; i++) {
            const archetype = GameUtils.randomChoice(STAFF_ARCHETYPES);
            const character = this.createCharacter(archetype, names[nameIndex++], CHARACTER_TYPES.STAFF);
            this.characters.push(character);
        }
        
        // Generate 2-5 investigators (random chance)
        const investigatorCount = GameUtils.randomInt(2, 5);
        for (let i = 0; i < investigatorCount; i++) {
            const archetype = GameUtils.randomChoice(INVESTIGATOR_ARCHETYPES);
            const character = this.createCharacter(archetype, names[nameIndex++], CHARACTER_TYPES.INVESTIGATOR);
            character.detectionLevel = 0;
            character.equipmentActive = false;
            this.characters.push(character);
        }
        
        this.investigatorsPresent = investigatorCount > 0;
    }
    
    createCharacter(archetype, name, type) {
        const id = `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return {
            id,
            name,
            type,
            archetype: archetype.id,
            archetypeName: archetype.name,
            description: archetype.description,
            
            // Stats
            sanity: archetype.baseSanity || 70,
            maxSanity: archetype.baseSanity || 70,
            fear: 0,
            maxFear: 100,
            suspicion: 0,
            
            // State
            state: 'STABLE',
            possessed: false,
            possessedBy: null,
            asleep: false,
            dead: false,
            brokenDown: false,
            
            // Position
            x: 0,
            y: 0,
            floor: 0,
            room: null,
            
            // Fears and traits
            fears: [...(archetype.fears || [])],
            traits: [...(archetype.traits || [])],
            susceptibility: { ...(archetype.susceptibility || {}) },
            
            // AI
            schedule: this.generateSchedule(type),
            currentActivity: 'idle',
            targetRoom: null,
            movementSpeed: GameUtils.randomFloat(0.5, 1.5),
            
            // Relationships
            relationships: new Map(),
            
            // Effects
            activeEffects: [],
            cooldowns: new Map(),
            
            // Visualization
            avatar: this.getAvatarForType(type, archetype),
            color: this.getColorForType(type)
        };
    }
    
    generateNames() {
        const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
            'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
            'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra',
            'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
            'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa', 'Edward', 'Deborah',
            'Ronald', 'Stephanie', 'Timothy', 'Rebecca', 'Jason', 'Sharon', 'Jeffrey', 'Laura', 'Ryan', 'Cynthia',
            'Jacob', 'Kathleen', 'Gary', 'Amy', 'Nicholas', 'Shirley', 'Eric', 'Angela', 'Jonathan', 'Helen',
            'Stephen', 'Anna', 'Larry', 'Brenda', 'Justin', 'Pamela', 'Scott', 'Nicole', 'Brandon', 'Emma',
            'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Gregory', 'Christine', 'Frank', 'Debra', 'Alexander', 'Rachel',
            'Raymond', 'Catherine', 'Patrick', 'Carolyn', 'Jack', 'Janet', 'Dennis', 'Ruth', 'Jerry', 'Maria'];
        
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
            'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
            'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
            'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
            'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];
        
        const names = [];
        const used = new Set();
        
        while (names.length < 60) {
            const name = `${GameUtils.randomChoice(firstNames)} ${GameUtils.randomChoice(lastNames)}`;
            if (!used.has(name)) {
                used.add(name);
                names.push(name);
            }
        }
        
        return names;
    }
    
    getAvatarForType(type, archetype) {
        const patientAvatars = ['😔', '😰', '😠', '😵', '🤪', '😇', '😷', '🤥', '🥶', '😤', '🤕', '🔥', '🧩', '😭', '😴'];
        const staffAvatars = ['👨‍⚕️', '👩‍⚕️', '👮', '👮‍♀️', '👷', '👷‍♀️', '👨‍🍳', '👩‍🍳', '🧑‍🏫', '👨‍🔬', '👩‍🔬', '🧑‍💼'];
        const investigatorAvatars = ['🕵️', '👨‍🔬', '🔮', '⛪', '📰', '📿'];
        
        if (type === CHARACTER_TYPES.PATIENT) {
            // Try to match avatar to archetype
            if (archetype.id.includes('fire')) return '🔥';
            if (archetype.id.includes('religious')) return '⛪';
            if (archetype.id.includes('paranoid')) return '😰';
            if (archetype.id.includes('violent')) return '😠';
            if (archetype.id.includes('depressive')) return '😔';
            return GameUtils.randomChoice(patientAvatars);
        }
        if (type === CHARACTER_TYPES.STAFF) return GameUtils.randomChoice(staffAvatars);
        if (type === CHARACTER_TYPES.INVESTIGATOR) return GameUtils.randomChoice(investigatorAvatars);
        return '👤';
    }
    
    getColorForType(type) {
        if (type === CHARACTER_TYPES.PATIENT) return '#22d3ee';
        if (type === CHARACTER_TYPES.STAFF) return '#a3e635';
        if (type === CHARACTER_TYPES.INVESTIGATOR) return '#f472b6';
        return '#94a3b8';
    }
    
    generateSchedule(type) {
        const schedule = [];
        for (let hour = 0; hour < 24; hour++) {
            if (type === CHARACTER_TYPES.PATIENT) {
                if (hour < 7) schedule.push(SCHEDULE_ACTIVITIES.SLEEP);
                else if (hour < 8) schedule.push(SCHEDULE_ACTIVITIES.WAKE);
                else if (hour < 9) schedule.push(SCHEDULE_ACTIVITIES.MEAL);
                else if (hour < 12) schedule.push(Math.random() > 0.5 ? SCHEDULE_ACTIVITIES.THERAPY : SCHEDULE_ACTIVITIES.RECREATION);
                else if (hour < 13) schedule.push(SCHEDULE_ACTIVITIES.MEAL);
                else if (hour < 17) schedule.push(SCHEDULE_ACTIVITIES.FREE);
                else if (hour < 18) schedule.push(SCHEDULE_ACTIVITIES.MEAL);
                else if (hour < 22) schedule.push(SCHEDULE_ACTIVITIES.RECREATION);
                else schedule.push(SCHEDULE_ACTIVITIES.SLEEP);
            } else if (type === CHARACTER_TYPES.STAFF) {
                if (hour >= 8 && hour < 18) schedule.push(SCHEDULE_ACTIVITIES.WORK);
                else schedule.push(SCHEDULE_ACTIVITIES.NIGHT_DUTY);
            } else {
                schedule.push(SCHEDULE_ACTIVITIES.RESEARCH);
            }
        }
        return schedule;
    }
    
    // ==========================================
    // LAYOUT LOADING
    // ==========================================
    
    loadLayout(index) {
        this.currentLayout = index;
        const layout = ASYLUM_LAYOUTS[index];
        this.rooms = layout.rooms.map(r => ({ ...r, occupants: [], haunted: false }));
        
        // Position characters in appropriate rooms
        this.positionCharacters();
    }
    
    positionCharacters() {
        // Get rooms by type for each floor
        const getRoomsByFloor = (floor) => this.rooms.filter(r => r.floor === floor);
        
        this.characters.forEach(char => {
            // Choose floor based on character type and randomness
            let floor = 0;
            if (char.type === CHARACTER_TYPES.PATIENT) {
                floor = GameUtils.randomChoice([0, 1, 1, 1, 2, 2, -1]); // Patients mostly on floors 1-2
            } else if (char.type === CHARACTER_TYPES.STAFF) {
                floor = GameUtils.randomChoice([0, 0, 1, 1, -1]); // Staff on ground and floor 1
            } else {
                floor = GameUtils.randomChoice([0, 0, 0, 1, 1, -1]); // Investigators everywhere
            }
            
            const floorRooms = getRoomsByFloor(floor);
            if (floorRooms.length > 0) {
                const room = GameUtils.randomChoice(floorRooms);
                char.room = room.id;
                char.floor = floor;
                char.x = room.x + Math.random() * room.w;
                char.y = room.y + Math.random() * room.h;
                room.occupants.push(char.id);
            }
        });
    }
    
    // ==========================================
    // RELATIONSHIP & FEAR NETWORK
    // ==========================================
    
    generateRelationships() {
        // Create relationships between characters
        for (let i = 0; i < this.characters.length; i++) {
            const charA = this.characters[i];
            
            // Each character has 2-6 relationships
            const relationshipCount = GameUtils.randomInt(2, 6);
            
            for (let j = 0; j < relationshipCount; j++) {
                const charB = GameUtils.randomChoice(this.characters.filter(c => c.id !== charA.id));
                
                if (!charA.relationships.has(charB.id)) {
                    const relationshipTypes = ['friend', 'enemy', 'family', 'acquaintance', 'fears', 'trusts'];
                    const type = GameUtils.randomChoice(relationshipTypes);
                    const strength = GameUtils.randomFloat(0.3, 1.0);
                    
                    charA.relationships.set(charB.id, { type, strength, target: charB });
                    
                    // Build fear network
                    this.addToFearNetwork(charA.id, charB.id, strength);
                }
            }
        }
    }
    
    addToFearNetwork(idA, idB, strength) {
        if (!this.fearNetwork.has(idA)) {
            this.fearNetwork.set(idA, new Map());
        }
        this.fearNetwork.get(idA).set(idB, strength);
    }
    
    propagateFear(sourceId, amount) {
        const visited = new Set();
        const queue = [{ id: sourceId, fear: amount, distance: 0 }];
        
        while (queue.length > 0) {
            const current = queue.shift();
            
            if (visited.has(current.id) || current.distance > 3) continue;
            visited.add(current.id);
            
            const character = this.getCharacter(current.id);
            if (character && !character.dead) {
                // Apply fear with distance decay
                const decayedFear = current.fear * Math.pow(0.6, current.distance);
                this.applyFear(character, decayedFear, 'network');
            }
            
            // Propagate to connected characters
            const connections = this.fearNetwork.get(current.id);
            if (connections) {
                connections.forEach((strength, targetId) => {
                    if (!visited.has(targetId)) {
                        queue.push({
                            id: targetId,
                            fear: current.fear * strength,
                            distance: current.distance + 1
                        });
                    }
                });
            }
        }
    }
    
    // ==========================================
    // CORE GAME LOOP
    // ==========================================
    
    update(deltaTime) {
        if (this.paused || this.gameOver) return;
        
        this.gameTime += deltaTime;
        this.stats.timePlayed += deltaTime;
        
        // Update day/night cycle
        this.updateDayNightCycle(deltaTime);
        
        // Regenerate essence
        this.updateEssence(deltaTime);
        
        // Decay suspicion
        this.updateSuspicion(deltaTime);
        
        // Update characters
        this.updateCharacters(deltaTime);
        
        // Update hauntings
        this.updateHauntings(deltaTime);
        
        // Check fear epidemic
        this.checkFearEpidemic();
        
        // Check win/lose conditions
        this.checkGameEnd();
        
        // Check achievements
        this.checkAchievements();
    }
    
    updateDayNightCycle(deltaTime) {
        this.dayNightCycle += deltaTime;
        const cycleProgress = (this.dayNightCycle % DAY_LENGTH) / DAY_LENGTH;
        this.isDay = cycleProgress > 0.25 && cycleProgress < 0.75;
    }
    
    updateEssence(deltaTime) {
        const regen = this.difficulty.essenceRegen * deltaTime;
        this.essence = Math.min(this.maxEssence, this.essence + regen);
        
        // Bonus essence at night
        if (!this.isDay) {
            this.essence = Math.min(this.maxEssence, this.essence + regen * 0.5);
        }
    }
    
    updateSuspicion(deltaTime) {
        const decay = this.difficulty.suspicionDecay * deltaTime;
        this.suspicion = Math.max(0, this.suspicion - decay);
        
        // Undetected time tracking
        if (this.suspicion < 25) {
            this.stats.undetectedTime += deltaTime;
        }
    }
    
    updateCharacters(deltaTime) {
        const currentHour = Math.floor((this.dayNightCycle % DAY_LENGTH) / (DAY_LENGTH / 24));
        
        this.characters.forEach(char => {
            if (char.dead || char.brokenDown) return;
            
            // Update cooldowns
            char.cooldowns.forEach((time, key) => {
                char.cooldowns.set(key, Math.max(0, time - deltaTime));
            });
            
            // Update AI state
            this.updateCharacterAI(char, currentHour, deltaTime);
            
            // Natural sanity recovery during day
            if (this.isDay && char.fear < 20) {
                char.sanity = Math.min(char.maxSanity, char.sanity + deltaTime * 0.5);
            }
            
            // Fear decay
            if (char.fear > 0) {
                char.fear = Math.max(0, char.fear - deltaTime * 2);
            }
            
            // Update mental state
            this.updateMentalState(char);
            
            // Check for mental breakdown
            if (char.sanity <= 0 && !char.brokenDown) {
                this.triggerBreakdown(char);
            }
            
            // Investigators detection
            if (char.type === CHARACTER_TYPES.INVESTIGATOR) {
                this.updateInvestigator(char, deltaTime);
            }
        });
    }
    
    updateCharacterAI(char, hour, deltaTime) {
        // Get current scheduled activity
        const scheduledActivity = char.schedule[hour] || SCHEDULE_ACTIVITIES.FREE;
        
        // If possessed, ghost controls movement
        if (char.possessed) return;
        
        // Fear affects behavior
        if (char.fear > 70) {
            // Terrified characters flee to safe spaces
            this.fleeToSafety(char, deltaTime);
            return;
        }
        
        // Move toward target room if has one
        if (char.targetRoom) {
            const targetRoom = this.rooms.find(r => r.id === char.targetRoom);
            if (targetRoom) {
                const dx = (targetRoom.x + targetRoom.w/2) - char.x;
                const dy = (targetRoom.y + targetRoom.h/2) - char.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist > 1) {
                    char.x += (dx / dist) * char.movementSpeed * deltaTime * 0.5;
                    char.y += (dy / dist) * char.movementSpeed * deltaTime * 0.5;
                } else {
                    char.targetRoom = null;
                }
            }
        } else if (Math.random() < 0.01) {
            // Random movement
            const floorRooms = this.rooms.filter(r => r.floor === char.floor);
            if (floorRooms.length > 0) {
                const randomRoom = GameUtils.randomChoice(floorRooms);
                char.targetRoom = randomRoom.id;
            }
        }
        
        char.currentActivity = scheduledActivity;
    }
    
    fleeToSafety(char, deltaTime) {
        // Move toward perceived safety (other people, lights, exits)
        const nearbyChars = this.characters.filter(c => 
            c.id !== char.id && 
            c.floor === char.floor && 
            !c.dead &&
            Math.sqrt((c.x - char.x)**2 + (c.y - char.y)**2) < 10
        );
        
        if (nearbyChars.length > 0) {
            // Flee toward groups
            const avgX = nearbyChars.reduce((sum, c) => sum + c.x, 0) / nearbyChars.length;
            const avgY = nearbyChars.reduce((sum, c) => sum + c.y, 0) / nearbyChars.length;
            
            const dx = avgX - char.x;
            const dy = avgY - char.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > 0) {
                char.x += (dx / dist) * char.movementSpeed * 2 * deltaTime * 0.5;
                char.y += (dy / dist) * char.movementSpeed * 2 * deltaTime * 0.5;
            }
        }
    }
    
    updateMentalState(char) {
        const sanityPercent = char.sanity / char.maxSanity;
        const fearPercent = char.fear / char.maxFear;
        
        if (char.possessed) {
            char.state = 'POSSESSED';
        } else if (fearPercent > 0.9) {
            char.state = 'HYSTERICAL';
        } else if (fearPercent > 0.7) {
            char.state = 'TERRIFIED';
        } else if (fearPercent > 0.5) {
            char.state = 'ANXIOUS';
        } else if (fearPercent > 0.3) {
            char.state = 'UNEASY';
        } else if (sanityPercent < 0.3) {
            char.state = 'VIOLENT';
        } else {
            char.state = 'STABLE';
        }
    }
    
    updateInvestigator(char, deltaTime) {
        // Investigators detect ghost activity
        if (!char.equipmentActive) {
            char.equipmentActive = Math.random() < 0.3;
        }
        
        if (char.equipmentActive && this.suspicion > 20) {
            char.detectionLevel += deltaTime * (this.suspicion / 100) * this.difficulty.aiAlertness;
            
            if (char.detectionLevel > 50 && Math.random() < 0.01) {
                this.logEvent('suspicion', `${char.name}'s equipment detects unusual activity!`);
            }
            
            if (char.detectionLevel > 100) {
                this.triggerInvestigation(char);
            }
        }
    }
    
    updateHauntings(deltaTime) {
        this.activeHauntings = this.activeHauntings.filter(h => {
            h.duration -= deltaTime;
            
            if (h.duration <= 0) {
                // Haunting ends
                if (h.targetRoom) {
                    const room = this.rooms.find(r => r.id === h.targetRoom);
                    if (room) room.haunted = false;
                }
                return false;
            }
            
            // Continue affecting characters in range
            this.characters.forEach(char => {
                if (char.floor === h.floor && !char.dead) {
                    const dist = Math.sqrt((char.x - h.x)**2 + (char.y - h.y)**2);
                    if (dist < h.radius) {
                        this.applyFear(char, h.fearPerSecond * deltaTime, 'haunting');
                    }
                }
            });
            
            return true;
        });
    }
    
    checkFearEpidemic() {
        const terrifiedCount = this.characters.filter(c => 
            !c.dead && (c.state === 'TERRIFIED' || c.state === 'HYSTERICAL')
        ).length;
        
        const totalAlive = this.characters.filter(c => !c.dead).length;
        const terrifiedPercent = terrifiedCount / totalAlive;
        
        if (terrifiedPercent > 0.3 && !this.epidemicActive) {
            this.epidemicActive = true;
            this.stats.fearEpidemics++;
            this.logEvent('event', '⚠️ FEAR EPIDEMIC BEGINS! Mass hysteria is spreading!', true);
            
            // All characters gain fear faster
            this.characters.forEach(c => {
                if (!c.dead) this.applyFear(c, 20, 'epidemic');
            });
        } else if (terrifiedPercent < 0.15 && this.epidemicActive) {
            this.epidemicActive = false;
            this.logEvent('event', 'Fear epidemic subsides... for now.');
        }
    }
    
    // ==========================================
    // ACTIONS & EFFECTS
    // ==========================================
    
    applyFear(char, amount, source) {
        // Apply susceptibility modifiers
        let modifiedAmount = amount;
        
        if (char.susceptibility && char.susceptibility[source]) {
            modifiedAmount *= char.susceptibility[source];
        }
        
        // Time of day modifier
        if (!this.isDay) modifiedAmount *= 1.3;
        
        // Epidemic modifier
        if (this.epidemicActive) modifiedAmount *= 1.5;
        
        // Apply fear
        char.fear = Math.min(char.maxFear, char.fear + modifiedAmount);
        
        // Fear drains sanity
        const sanityLoss = modifiedAmount * 0.5;
        char.sanity = Math.max(0, char.sanity - sanityLoss);
        this.stats.totalSanityDrained += sanityLoss;
        
        // Propagate through fear network
        if (amount > 10) {
            this.propagateFear(char.id, amount * 0.3);
            this.stats.chainReactions++;
        }
    }
    
    triggerBreakdown(char) {
        char.brokenDown = true;
        this.stats.breakdowns++;
        
        // Determine breakdown type
        const breakdownTypes = ['catatonic', 'violent', 'hysterical'];
        const type = GameUtils.randomChoice(breakdownTypes);
        
        let description = '';
        switch(type) {
            case 'catatonic':
                description = `${char.name} has gone completely catatonic, staring into space.`;
                break;
            case 'violent':
                description = `${char.name} snaps and attacks nearby people!`;
                // Violent breakdowns cause fear in nearby characters
                this.characters.forEach(c => {
                    if (c.id !== char.id && c.floor === char.floor && !c.dead) {
                        const dist = Math.sqrt((c.x - char.x)**2 + (c.y - char.y)**2);
                        if (dist < 5) {
                            this.applyFear(c, 30, 'witness');
                        }
                    }
                });
                break;
            case 'hysterical':
                description = `${char.name} collapses into uncontrollable hysterics!`;
                break;
        }
        
        this.logEvent('fear', description, true);
        
        // Check for silent breakdown
        if (this.suspicion < 25) {
            this.stats.silentBreakdowns++;
        }
    }
    
    triggerInvestigation(investigator) {
        this.logEvent('suspicion', `${investigator.name} has gathered enough evidence! They're preparing to banish you!`, true);
        
        // Check if can be banished
        if (this.suspicion > 80) {
            this.triggerBanishment();
        }
    }
    
    triggerBanishment() {
        this.gameOver = true;
        this.victory = false;
        this.logEvent('event', 'You have been BANISHED! The investigators have succeeded.', true);
    }
    
    // ==========================================
    // GHOST ACTIONS
    // ==========================================
    
    canAfford(cost) {
        return this.essence >= cost;
    }
    
    spendEssence(amount) {
        this.essence = Math.max(0, this.essence - amount);
    }
    
    haunt(typeId, target) {
        const haunting = this.findHauntingById(typeId);
        if (!haunting) return false;
        
        if (!this.canAfford(haunting.cost)) {
            this.logEvent('system', 'Not enough essence!');
            return false;
        }
        
        this.spendEssence(haunting.cost);
        this.stats.hauntings++;
        
        // Execute haunting
        if (target && target.type === 'character') {
            const char = this.getCharacter(target.id);
            if (char) {
                this.executeHauntingOnCharacter(haunting, char);
            }
        } else if (target && target.type === 'room') {
            this.executeHauntingOnRoom(haunting, target.id);
        } else {
            // Area haunting
            this.executeHauntingInArea(haunting, this.ghostPosition);
        }
        
        this.logEvent('haunt', `Used ${haunting.name}`);
        return true;
    }
    
    findHauntingById(id) {
        for (const category of Object.values(HAUNTING_TYPES)) {
            const found = category.find(h => h.id === id);
            if (found) return found;
        }
        return null;
    }
    
    executeHauntingOnCharacter(haunting, char) {
        // Calculate fear based on matching fears
        let fearAmount = 20;
        
        // Check if haunting matches character fears
        if (haunting.id.includes('blood') && char.fears.includes('blood')) fearAmount *= 2;
        if (haunting.id.includes('shadow') && char.fears.includes('darkness')) fearAmount *= 1.5;
        if (haunting.id.includes('demon') && char.fears.includes('demons')) fearAmount *= 2.5;
        
        this.applyFear(char, fearAmount, 'haunting');
        
        // Increase suspicion
        this.suspicion = Math.min(this.maxSuspicion, this.suspicion + 2);
        
        // Log
        this.logEvent('fear', `${char.name} is terrified by ${haunting.name.toLowerCase()}!`);
    }
    
    executeHauntingOnRoom(haunting, roomId) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) return;
        
        room.haunted = true;
        
        // Add to active hauntings
        this.activeHauntings.push({
            type: haunting.id,
            x: room.x + room.w/2,
            y: room.y + room.h/2,
            floor: room.floor,
            targetRoom: roomId,
            radius: Math.max(room.w, room.h),
            fearPerSecond: 10,
            duration: haunting.cooldown || 30
        });
        
        // Affect characters in room
        room.occupants.forEach(charId => {
            const char = this.getCharacter(charId);
            if (char) this.applyFear(char, 30, 'haunting');
        });
        
        this.suspicion = Math.min(this.maxSuspicion, this.suspicion + 1);
    }
    
    executeHauntingInArea(haunting, position) {
        this.activeHauntings.push({
            type: haunting.id,
            x: position.x,
            y: position.y,
            floor: position.floor,
            radius: 5,
            fearPerSecond: 5,
            duration: haunting.cooldown || 30
        });
        
        this.suspicion = Math.min(this.maxSuspicion, this.suspicion + 1);
    }
    
    possess(targetId) {
        if (!this.canAfford(30)) return false;
        
        const char = this.getCharacter(targetId);
        if (!char || char.dead || char.possessed) return false;
        
        this.spendEssence(30);
        this.stats.possessions++;
        
        char.possessed = true;
        char.possessedBy = 'ghost';
        this.possessedTarget = char;
        
        this.logEvent('possession', `You have possessed ${char.name}!`, true);
        return true;
    }
    
    releasePossession() {
        if (this.possessedTarget) {
            this.possessedTarget.possessed = false;
            this.possessedTarget.possessedBy = null;
            this.possessedTarget = null;
            this.logEvent('possession', 'You release your vessel.');
        }
    }
    
    teleport(x, y, floor) {
        if (!this.canAfford(15)) return false;
        
        this.spendEssence(15);
        this.ghostPosition = { x, y, floor };
        
        // If possessing someone, move them too
        if (this.possessedTarget) {
            this.possessedTarget.x = x;
            this.possessedTarget.y = y;
            this.possessedTarget.floor = floor;
        }
        
        return true;
    }
    
    manifest() {
        if (!this.canAfford(10)) return false;
        
        this.spendEssence(10);
        
        // Manifesting increases suspicion but causes fear in nearby characters
        this.suspicion = Math.min(this.maxSuspicion, this.suspicion + 5);
        
        this.characters.forEach(char => {
            if (char.floor === this.ghostPosition.floor && !char.dead) {
                const dist = Math.sqrt((char.x - this.ghostPosition.x)**2 + (char.y - this.ghostPosition.y)**2);
                if (dist < 8) {
                    this.applyFear(char, 25, 'manifestation');
                }
            }
        });
        
        this.logEvent('haunt', 'You manifest visibly, striking fear into nearby hearts!');
        return true;
    }
    
    dreadScream() {
        if (!this.canAfford(25)) return false;
        
        this.spendEssence(25);
        
        // Massive fear in area, but high suspicion
        this.suspicion = Math.min(this.maxSuspicion, this.suspicion + 15);
        
        this.characters.forEach(char => {
            if (char.floor === this.ghostPosition.floor && !char.dead) {
                const dist = Math.sqrt((char.x - this.ghostPosition.x)**2 + (char.y - this.ghostPosition.y)**2);
                if (dist < 15) {
                    const fearAmount = 50 * (1 - dist/15);
                    this.applyFear(char, fearAmount, 'scream');
                }
            }
        });
        
        this.logEvent('haunt', 'Your DREAD SCREAM echoes through the halls!', true);
        return true;
    }
    
    // ==========================================
    // ABILITY TREE
    // ==========================================
    
    unlockAbility(abilityId) {
        const ability = this.findAbilityById(abilityId);
        if (!ability) return false;
        
        if (this.unlockedAbilities.has(abilityId)) return false;
        
        // Check prerequisites
        const hasPrereq = this.checkPrerequisites(ability);
        if (!hasPrereq) return false;
        
        if (this.abilityPoints < ability.cost) {
            this.logEvent('system', 'Not enough ability points!');
            return false;
        }
        
        this.abilityPoints -= ability.cost;
        this.unlockedAbilities.add(abilityId);
        
        this.logEvent('event', `Unlocked: ${ability.name}`);
        return true;
    }
    
    findAbilityById(id) {
        for (const branch of Object.values(ABILITY_BRANCHES)) {
            const found = branch.abilities.find(a => a.id === id);
            if (found) return found;
        }
        return null;
    }
    
    checkPrerequisites(ability) {
        // Find which branch contains this ability
        for (const branch of Object.values(ABILITY_BRANCHES)) {
            const idx = branch.abilities.findIndex(a => a.id === ability.id);
            if (idx !== -1) {
                // First ability in branch is always available
                if (idx === 0) return true;
                
                // Check if any unlocking ability is unlocked
                const prevAbility = branch.abilities[idx - 1];
                return this.unlockedAbilities.has(prevAbility.id);
            }
        }
        return false;
    }
    
    hasCompleteBranch() {
        for (const branch of Object.values(ABILITY_BRANCHES)) {
            const allUnlocked = branch.abilities.every(a => this.unlockedAbilities.has(a.id));
            if (allUnlocked) return true;
        }
        return false;
    }
    
    hasAllAbilities() {
        for (const branch of Object.values(ABILITY_BRANCHES)) {
            if (!branch.abilities.every(a => this.unlockedAbilities.has(a.id))) {
                return false;
            }
        }
        return true;
    }
    
    // ==========================================
    // UTILITY METHODS
    // ==========================================
    
    getCharacter(id) {
        return this.characters.find(c => c.id === id);
    }
    
    getCharactersByType(type) {
        return this.characters.filter(c => c.type === type && !c.dead);
    }
    
    getTerrifiedCount() {
        return this.characters.filter(c => 
            !c.dead && (c.state === 'TERRIFIED' || c.state === 'HYSTERICAL' || c.state === 'VIOLENT')
        ).length;
    }
    
    getRoom(id) {
        return this.rooms.find(r => r.id === id);
    }
    
    getCharactersInRoom(roomId) {
        return this.characters.filter(c => c.room === roomId && !c.dead);
    }
    
    logEvent(type, message, important = false) {
        const time = this.formatGameTime();
        this.eventLog.unshift({ type, message, time, important });
        
        if (this.eventLog.length > this.maxLogEntries) {
            this.eventLog.pop();
        }
        
        if (important) {
            // Could trigger sound effect here
        }
    }
    
    formatGameTime() {
        const totalMinutes = Math.floor(this.gameTime / 60);
        const hours = Math.floor(totalMinutes / 60) % 24;
        const minutes = totalMinutes % 60;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }
    
    checkGameEnd() {
        // Victory: All patients broken down or insane
        const patients = this.characters.filter(c => c.type === CHARACTER_TYPES.PATIENT);
        const brokenPatients = patients.filter(c => c.brokenDown || c.sanity < 10).length;
        
        if (brokenPatients >= patients.length * 0.8) {
            this.gameOver = true;
            this.victory = true;
            this.logEvent('event', 'VICTORY! The asylum has fallen to madness!', true);
            return;
        }
        
        // Defeat: Suspicion maxed out
        if (this.suspicion >= 100) {
            this.triggerBanishment();
        }
    }
    
    checkAchievements() {
        ACHIEVEMENTS.forEach(ach => {
            if (!ach.unlocked && ach.condition(this)) {
                ach.unlocked = true;
                this.showAchievement(ach);
            }
        });
    }
    
    showAchievement(achievement) {
        // Would show toast notification
        console.log(`Achievement Unlocked: ${achievement.name}`);
    }
}
