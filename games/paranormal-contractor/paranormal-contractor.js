/* ============================================================
   PARANORMAL CONTRACTOR — Ghost Hunting Business Simulation
   Version: 1.0.0
   
   A comprehensive ghost hunting business management game featuring:
   - Business management (finances, employees, reputation)
   - 12 unique location types with procedural generation
   - 30+ ghost types with unique behaviors and AI
   - Equipment system (detection, documentation, protection, containment)
   - First-person investigation mechanics
   - Evidence collection and ghost identification
   - Contract types: Investigation, Documentation, Containment, Exorcism
   - Permadeath mode option
   - Co-op multiplayer support structure
   
   Integration: GameUtils, HorrorAudio
   ============================================================ */

(function () {
    'use strict';

    // ============================================================
    // CONSTANTS & CONFIGURATION
    // ============================================================
    
    const VERSION = '1.0.0';
    const SAVE_KEY = 'paranormal_contractor_save';
    
    const GAME_MODES = {
        CAREER: 'career',
        SANDBOX: 'sandbox',
        CHALLENGE: 'challenge'
    };
    
    const CONTRACT_TYPES = {
        INVESTIGATION: 'investigation',
        DOCUMENTATION: 'documentation',
        CONTAINMENT: 'containment',
        EXORCISM: 'exorcism',
        CONSULTATION: 'consultation'
    };
    
    const EQUIPMENT_CATEGORIES = {
        DETECTION: 'detection',
        DOCUMENTATION: 'documentation',
        PROTECTION: 'protection',
        CONTAINMENT: 'containment'
    };
    
    const EVIDENCE_TYPES = {
        EMF_LEVEL_5: 'emf_level_5',
        SPIRIT_BOX: 'spirit_box',
        GHOST_WRITING: 'ghost_writing',
        GHOST_ORB: 'ghost_orb',
        FINGERPRINTS: 'fingerprints',
        FREEZING_TEMPS: 'freezing_temps',
        DOTS_PROJECTOR: 'dots_projector',
        ULTRAVIOLET: 'ultraviolet'
    };

    // ============================================================
    // GHOST TYPE DATABASE (30+ Ghosts)
    // ============================================================
    
    const GHOST_TYPES = {
        // Tier 1: Common Spirits
        poltergeist: {
            id: 'poltergeist',
            name: 'Poltergeist',
            classification: 'Spirit',
            danger: 3,
            intelligence: 6,
            aggression: 8,
            speed: 5,
            abilities: ['telekinesis', 'object_throwing', 'noise_generation'],
            evidence: ['emf_level_5', 'spirit_box', 'ghost_writing'],
            weaknesses: ['salt', 'lack_of_attention'],
            strengths: ['multiple_people', 'chaos'],
            behavior: 'Poltergeists feed on attention and energy. They become more active with multiple people present.',
            hunting_threshold: 50,
            hunt_duration: 40,
            unique_trait: 'Throws multiple objects simultaneously'
        },
        
        banshee: {
            id: 'banshee',
            name: 'Banshee',
            classification: 'Spirit',
            danger: 5,
            intelligence: 8,
            aggression: 4,
            speed: 7,
            abilities: ['death_wail', 'sonic_attack', 'target_lock'],
            evidence: ['spirit_box', 'ghost_orb', 'freezing_temps'],
            weaknesses: ['crucifix', 'music'],
            strengths: ['isolated_targets', 'silence'],
            behavior: 'Banshees target one player at a time. Their wail can drain sanity rapidly.',
            hunting_threshold: 60,
            hunt_duration: 50,
            unique_trait: 'Targets lowest sanity player exclusively'
        },
        
        shade: {
            id: 'shade',
            name: 'Shade',
            classification: 'Spirit',
            danger: 2,
            intelligence: 5,
            aggression: 2,
            speed: 3,
            abilities: ['shadow_form', 'light_avoidance', 'stealth'],
            evidence: ['emf_level_5', 'ghost_writing', 'ghost_orb'],
            weaknesses: ['bright_lights', 'group_presence'],
            strengths: ['darkness', 'isolation'],
            behavior: 'Shades are shy ghosts that rarely hunt when multiple people are nearby.',
            hunting_threshold: 35,
            hunt_duration: 30,
            unique_trait: 'Cannot hunt if 2+ people in room'
        },
        
        spirit: {
            id: 'spirit',
            name: 'Spirit',
            classification: 'Spirit',
            danger: 2,
            intelligence: 5,
            aggression: 3,
            speed: 4,
            abilities: ['basic_manifestation', 'simple_interaction'],
            evidence: ['emf_level_5', 'spirit_box', 'ghost_writing'],
            weaknesses: ['smudge_sticks'],
            strengths: [],
            behavior: 'The most common ghost type. Spirits can be temporarily warded off with smudge sticks.',
            hunting_threshold: 50,
            hunt_duration: 40,
            unique_trait: 'Smudge sticks disable hunt for 180 seconds'
        },
        
        // Tier 2: Aggressive Entities
        phantom: {
            id: 'phantom',
            name: 'Phantom',
            classification: 'Entity',
            danger: 4,
            intelligence: 7,
            aggression: 6,
            speed: 5,
            abilities: ['invisibility', 'sanity_drain_on_look', 'teleportation'],
            evidence: ['spirit_box', 'fingerprints', 'dots_projector'],
            weaknesses: ['photo_evidence', 'being_watched'],
            strengths: ['line_of_sight'],
            behavior: 'Phantoms can possess the living, most commonly summoned by an Ouija Board. Looking at them drains sanity rapidly.',
            hunting_threshold: 55,
            hunt_duration: 50,
            unique_trait: 'Disappears when photo taken; drains sanity when looked at'
        },
        
        wraith: {
            id: 'wraith',
            name: 'Wraith',
            classification: 'Entity',
            danger: 6,
            intelligence: 8,
            aggression: 7,
            speed: 8,
            abilities: ['flight', 'teleport_to_target', 'wall_piercing'],
            evidence: ['emf_level_5', 'spirit_box', 'dots_projector'],
            weaknesses: ['salt', 'salt_trap'],
            strengths: ['doors', 'floors'],
            behavior: 'Wraiths are one of the most dangerous ghosts. They can fly and will never touch the ground.',
            hunting_threshold: 60,
            hunt_duration: 55,
            unique_trait: 'Never leaves UV footprints; can teleport to target'
        },
        
        revenant: {
            id: 'revenant',
            name: 'Revenant',
            classification: 'Entity',
            danger: 8,
            intelligence: 6,
            aggression: 9,
            speed: 3, // Slow when not hunting
            hunt_speed: 9, // Very fast when hunting
            abilities: ['superhuman_strength', 'relentless_pursuit', 'door_breaking'],
            evidence: ['ghost_orb', 'ghost_writing', 'freezing_temps'],
            weaknesses: ['hiding', 'losing_line_of_sight'],
            strengths: ['pursuit', 'tracking'],
            behavior: 'Revenants are slow but deadly. When they see a target, they move at terrifying speeds.',
            hunting_threshold: 50,
            hunt_duration: 60,
            unique_trait: 'Extremely fast when hunting; very slow when searching'
        },
        
        mare: {
            id: 'mare',
            name: 'Mare',
            classification: 'Entity',
            danger: 5,
            intelligence: 6,
            aggression: 6,
            speed: 6,
            abilities: ['light_destruction', 'darkness_preference', 'nightmare_inducement'],
            evidence: ['spirit_box', 'ghost_orb', 'ghost_writing'],
            weaknesses: ['lights', 'bright_areas'],
            strengths: ['darkness', 'light_switch_interaction'],
            behavior: 'Mares are the source of all nightmares. They thrive in darkness and will turn off lights.',
            hunting_threshold: 40, // Lower in darkness
            hunt_duration: 45,
            unique_trait: 'Prefers dark rooms; hunts more often in darkness'
        },
        
        // Tier 3: Demonic & Shadow Entities
        demon: {
            id: 'demon',
            name: 'Demon',
            classification: 'Demon',
            danger: 10,
            intelligence: 10,
            aggression: 10,
            speed: 7,
            abilities: ['possession', 'early_hunting', 'sanity_drain', 'reality_manipulation'],
            evidence: ['ultraviolet', 'ghost_writing', 'freezing_temps'],
            weaknesses: ['crucifix', 'smudge_sticks', 'holy_water'],
            strengths: ['ouija_board', 'summoning_circles'],
            behavior: 'Demons are the most aggressive ghosts. They can hunt at high sanity levels and drain sanity faster.',
            hunting_threshold: 70, // Can hunt at high sanity!
            hunt_duration: 60,
            unique_trait: 'Can hunt at 70% sanity; crucifix range doubled'
        },
        
        oni: {
            id: 'oni',
            name: 'Oni',
            classification: 'Demon',
            danger: 7,
            intelligence: 9,
            aggression: 8,
            speed: 7,
            abilities: ['physical_manifestation', 'object_interaction', 'strength'],
            evidence: ['emf_level_5', 'freezing_temps', 'dots_projector'],
            weaknesses: ['group_presence', 'being_watched'],
            strengths: ['isolated_targets', 'physical_activity'],
            behavior: 'Oni are demonic warriors that thrive on physical activity. They are more active when people are grouped.',
            hunting_threshold: 50,
            hunt_duration: 50,
            unique_trait: 'More active with group; cannot do ghost events when player alone'
        },
        
        yokai: {
            id: 'yokai',
            name: 'Yokai',
            classification: 'Demon',
            danger: 4,
            intelligence: 5,
            aggression: 5,
            speed: 5,
            abilities: ['sound_sensitivity', 'electronic_disturbance', 'voice_mimicry'],
            evidence: ['spirit_box', 'ghost_orb', 'dots_projector'],
            weaknesses: ['silence', 'quiet'],
            strengths: ['loud_noises', 'talking'],
            behavior: 'Yokai are attracted to human voices. They become more active when players talk near them.',
            hunting_threshold: 50,
            hunt_duration: 40,
            unique_trait: 'Talking near ghost increases activity; hunts more often if players talk during hunt'
        },
        
        // Tier 4: Shadow Entities
        shadow_person: {
            id: 'shadow_person',
            name: 'Shadow Person',
            classification: 'Shadow',
            danger: 6,
            intelligence: 8,
            aggression: 5,
            speed: 6,
            abilities: ['shadow_form', 'peripheral_vision', 'fear_inducement', 'possession_attempts'],
            evidence: ['ghost_orb', 'emf_level_5', 'dots_projector'],
            weaknesses: ['bright_lights', 'group_presence'],
            strengths: ['darkness', 'isolated_targets', 'low_sanity'],
            behavior: 'Shadow People feed on fear and are attracted to low sanity. They appear in peripheral vision.',
            hunting_threshold: 40,
            hunt_duration: 45,
            unique_trait: 'More likely to hunt at low sanity; harder to see'
        },
        
        yurei: {
            id: 'yurei',
            name: 'Yurei',
            classification: 'Shadow',
            danger: 5,
            intelligence: 7,
            aggression: 6,
            speed: 6,
            abilities: ['sanity_drain', 'door_closing', 'trapping'],
            evidence: ['ghost_orb', 'freezing_temps', 'dots_projector'],
            weaknesses: ['smudge_sticks'],
            strengths: ['door_manipulation'],
            behavior: 'Yurei are vengeful spirits that drain sanity faster than normal ghosts. They can close doors instantly.',
            hunting_threshold: 50,
            hunt_duration: 50,
            unique_trait: 'Sanity drains 2x faster; smudge sticks trap ghost in room for 90s'
        },
        
        hantu: {
            id: 'hantu',
            name: 'Hantu',
            classification: 'Shadow',
            danger: 6,
            intelligence: 6,
            aggression: 6,
            speed: 4, // Slow in warm areas
            cold_speed: 9, // Fast in cold
            abilities: ['cold_manipulation', 'breath_visibility', 'ice_formation'],
            evidence: ['ultraviolet', 'ghost_orb', 'freezing_temps'],
            weaknesses: ['warmth', 'heat'],
            strengths: ['cold_areas', 'freezing_temperatures'],
            behavior: 'Hantu are ghosts that thrive in cold environments. They move faster in freezing temperatures.',
            hunting_threshold: 50,
            hunt_duration: 50,
            unique_trait: 'Faster in cold rooms; visible breath in freezing temps'
        },
        
        // Tier 5: Unique Entities
        myling: {
            id: 'myling',
            name: 'Myling',
            classification: 'Entity',
            danger: 4,
            intelligence: 7,
            aggression: 5,
            speed: 7,
            abilities: ['quiet_hunt', 'audio_deception', 'childlike_voice'],
            evidence: ['emf_level_5', 'ultraviolet', 'ghost_writing'],
            weaknesses: ['loud_noise_response', 'parabolic_microphone'],
            strengths: ['stealth', 'quiet_movement'],
            behavior: 'Mylings are the ghosts of children. They are quiet during hunts and make little noise.',
            hunting_threshold: 50,
            hunt_duration: 40,
            unique_trait: 'Very quiet during hunt; makes more noise when hunted player is far away'
        },
        
        obake: {
            id: 'obake',
            name: 'Obake',
            classification: 'Entity',
            danger: 5,
            intelligence: 8,
            aggression: 5,
            speed: 5,
            abilities: ['shapeshifting', 'fingerprint_deception', 'form_changing'],
            evidence: ['emf_level_5', 'ultraviolet', 'ghost_orb'],
            weaknesses: ['careful_observation', 'camera_evidence'],
            strengths: ['deception', 'changing_evidence'],
            behavior: 'Obake are shapeshifters. They can change their ghost model and leave unique fingerprints.',
            hunting_threshold: 50,
            hunt_duration: 45,
            unique_trait: 'Can change ghost model during hunt; 75% chance for double UV prints'
        },
        
        raiju: {
            id: 'raiju',
            name: 'Raiju',
            classification: 'Entity',
            danger: 5,
            intelligence: 7,
            aggression: 6,
            speed: 5,
            hunt_speed: 10, // Max speed when near electronics
            abilities: ['electricity_consumption', 'speed_boost', 'electronic_disturbance'],
            evidence: ['emf_level_5', 'ghost_orb', 'dots_projector'],
            weaknesses: ['power_shutdown', 'isolation'],
            strengths: ['electronic_devices', 'powered_equipment'],
            behavior: 'Raiju are electricity demons. They move at incredible speeds when near electronic devices.',
            hunting_threshold: 50,
            hunt_duration: 50,
            unique_trait: 'Maximum speed when near powered electronics'
        },
        
        twins: {
            id: 'twins',
            name: 'The Twins',
            classification: 'Entity',
            danger: 5,
            intelligence: 8,
            aggression: 5,
            speed: 5,
            abilities: ['dual_presence', 'decoy_interaction', 'twin_deception'],
            evidence: ['emf_level_5', 'spirit_box', 'freezing_temps'],
            weaknesses: ['coordination', 'simultaneous_observation'],
            strengths: ['confusion', 'multiple_locations'],
            behavior: 'These ghosts mimic each other. They can interact with the environment from two locations at once.',
            hunting_threshold: 50,
            hunt_duration: 45,
            unique_trait: 'Either twin can hunt; interactions may happen at decoy location'
        },
        
        // Tier 6: Extreme Threats
        moroi: {
            id: 'moroi',
            name: 'Moroi',
            classification: 'Vampire',
            danger: 7,
            intelligence: 8,
            aggression: 7,
            speed: 6,
            abilities: ['sanity_vampire', 'curse', 'speed_increase'],
            evidence: ['spirit_box', 'ghost_writing', 'freezing_temps'],
            weaknesses: ['smudge_sticks', 'sanity_pills'],
            strengths: ['spirit_box_response', 'sanity_drain'],
            behavior: 'Moroi are vampire ghosts that drain sanity. They become faster as targets lose sanity.',
            hunting_threshold: 50,
            hunt_duration: 50,
            unique_trait: 'Speed increases with target sanity loss; curses player who gets spirit box response'
        },
        
        deogen: {
            id: 'deogen',
            name: 'Deogen',
            classification: 'Entity',
            danger: 6,
            intelligence: 10,
            aggression: 5,
            speed: 3,
            hunt_speed: 1, // Very slow when close
            abilities: ['player_detection', 'hiding_denial', 'reduced_invisibility'],
            evidence: ['spirit_box', 'dots_projector', 'ghost_writing'],
            weaknesses: ['hiding', 'looping'],
            strengths: ['detection', 'pursuit'],
            behavior: 'Deogen always knows where players are. They slow down when very close to their target.',
            hunting_threshold: 40,
            hunt_duration: 60,
            unique_trait: 'Always knows player location; extremely slow when within 2 meters'
        },
        
        thaye: {
            id: 'thaye',
            name: 'Thaye',
            classification: 'Entity',
            danger: 5,
            intelligence: 7,
            aggression: 5,
            speed: 7, // Fast when young
            abilities: ['aging', 'activity_cycle', 'early_aggression'],
            evidence: ['ghost_orb', 'ghost_writing', 'dots_projector'],
            weaknesses: ['time', 'aging'],
            strengths: ['youth', 'early_game'],
            behavior: 'Thaye age over time. They start aggressive and fast but become slower and less active as time passes.',
            hunting_threshold: 50,
            hunt_duration: 50,
            unique_trait: 'Ages every 1-2 minutes; starts aggressive, becomes passive over time'
        },
        
        // Additional Ghosts for variety
        goryo: {
            id: 'goryo',
            name: 'Goryo',
            classification: 'Spirit',
            danger: 4,
            intelligence: 7,
            aggression: 4,
            speed: 5,
            abilities: ['dots_through_walls', 'wandering', 'attachment'],
            evidence: ['emf_level_5', 'dots_projector', 'ultraviolet'],
            weaknesses: ['camera_evidence', 'dots_observation'],
            strengths: ['invisibility_without_camera'],
            behavior: 'Goryo rarely show themselves without a camera. They can only be seen through DOTS projectors when wandering.',
            hunting_threshold: 50,
            hunt_duration: 45,
            unique_trait: 'DOTS only visible through camera; never shows DOTS when player in same room'
        },
        
        onryo: {
            id: 'onryo',
            name: 'Onryo',
            classification: 'Spirit',
            danger: 6,
            intelligence: 6,
            aggression: 7,
            speed: 6,
            abilities: ['flame_extinction', 'fire_protection', 'candle_hunt'],
            evidence: ['spirit_box', 'ghost_orb', 'freezing_temps'],
            weaknesses: ['candles', 'flames'],
            strengths: ['extinguished_flames', 'hunt_from_fire'],
            behavior: 'Onryo are vengeful spirits that can hunt when flames are extinguished. Candles can protect against this.',
            hunting_threshold: 50,
            hunt_duration: 50,
            unique_trait: 'Can hunt when flame extinguished; candles act as crucifix'
        },
        
        the_mimic: {
            id: 'the_mimic',
            name: 'The Mimic',
            classification: 'Unknown',
            danger: 6,
            intelligence: 9,
            aggression: 6,
            speed: 5,
            abilities: ['ghost_imitation', 'evidence_mimicry', 'behavior_copying'],
            evidence: ['spirit_box', 'ultraviolet', 'freezing_temps', 'ghost_orb'],
            weaknesses: ['ghost_orb_evidence'],
            strengths: ['multiple_evidence_types', 'unpredictability'],
            behavior: 'The Mimic imitates other ghosts. They can display evidence of multiple ghost types simultaneously.',
            hunting_threshold: 50,
            hunt_duration: 45,
            unique_trait: 'Shows ghost orbs as 4th evidence type; changes behavior every hunt'
        },
        
        // Additional specialized ghosts
        jinn: {
            id: 'jinn',
            name: 'Jinn',
            classification: 'Entity',
            danger: 5,
            intelligence: 7,
            aggression: 5,
            speed: 5,
            hunt_speed: 8, // Fast when far from target
            abilities: ['power_drain', 'speed_distance', 'electronic_interference'],
            evidence: ['emf_level_5', 'ultraviolet', 'freezing_temps'],
            weaknesses: ['power_shutdown', 'breaker_off'],
            strengths: ['powered_electronics', 'distance'],
            behavior: 'Jinn interact with electronics and move faster when the breaker is on and target is far away.',
            hunting_threshold: 50,
            hunt_duration: 45,
            unique_trait: 'Faster when power on and player far; drains sanity faster near electronics'
        },
        
        onryo_vengeful: {
            id: 'onryo_vengeful',
            name: 'Vengeful Onryo',
            classification: 'Spirit',
            danger: 8,
            intelligence: 7,
            aggression: 9,
            speed: 7,
            abilities: ['flame_hunt', 'multi_extinction', 'sanity_drain_flame'],
            evidence: ['spirit_box', 'ghost_orb', 'freezing_temps', 'dots_projector'],
            weaknesses: ['multiple_candles', 'fire_protection'],
            strengths: ['extinguished_flames', 'rage_buildup'],
            behavior: 'A more aggressive variant of Onryo that hunts immediately when any flame is extinguished.',
            hunting_threshold: 55,
            hunt_duration: 55,
            unique_trait: 'Instant hunt chance on flame extinction; multiple flames required for protection'
        },
        
        skinwalker: {
            id: 'skinwalker',
            name: 'Skinwalker',
            classification: 'Shapeshifter',
            danger: 9,
            intelligence: 10,
            aggression: 8,
            speed: 8,
            abilities: ['player_mimicry', 'voice_copying', 'form_theft'],
            evidence: ['spirit_box', 'ultraviolet', 'ghost_writing'],
            weaknesses: ['holy_water', 'true_name'],
            strengths: ['deception', 'voice_mimicry'],
            behavior: 'Skinwalkers can perfectly mimic player voices and appearance. They are incredibly dangerous deceivers.',
            hunting_threshold: 45,
            hunt_duration: 60,
            unique_trait: 'Can mimic player voices through spirit box; changes appearance to match players'
        },
        
        wendigo: {
            id: 'wendigo',
            name: 'Wendigo',
            classification: 'Entity',
            danger: 9,
            intelligence: 7,
            aggression: 10,
            speed: 9,
            abilities: ['hunger_sense', 'speed_hunger', 'cannibalistic_instinct'],
            evidence: ['emf_level_5', 'freezing_temps', 'ghost_writing'],
            weaknesses: ['fire', 'group_presence'],
            strengths: ['isolated_targets', 'starving_players'],
            behavior: 'Wendigo are spirits of starvation. They hunt more aggressively when players are separated.',
            hunting_threshold: 40,
            hunt_duration: 65,
            unique_trait: 'Speed increases with player isolation; hunts more often when team split'
        },
        
        // Final tier - Legendary threats
        pontianak: {
            id: 'pontianak',
            name: 'Pontianak',
            classification: 'Demon',
            danger: 10,
            intelligence: 9,
            aggression: 9,
            speed: 8,
            abilities: ['scent_detection', 'female_targeting', 'perfume_lure'],
            evidence: ['spirit_box', 'ghost_orb', 'ultraviolet', 'freezing_temps'],
            weaknesses: ['nails', 'pregnancy_detection'],
            strengths: ['female_presence', 'perfume'],
            behavior: 'Pontianak are female vampiric ghosts. They target women and are attracted to perfume and long hair.',
            hunting_threshold: 55,
            hunt_duration: 55,
            unique_trait: 'Targets female players preferentially; perfume increases aggression'
        },
        
        zw_jiangshi: {
            id: 'zw_jiangshi',
            name: 'Jiangshi',
            classification: 'Undead',
            danger: 7,
            intelligence: 4,
            aggression: 8,
            speed: 6,
            abilities: ['hop_movement', 'breath_stealing', 'rice_sensory'],
            evidence: ['emf_level_5', 'ultraviolet', 'ghost_writing'],
            weaknesses: ['mirrors', 'sticky_rice', 'chicken_blood'],
            strengths: ['breath_detection', 'confined_spaces'],
            behavior: 'Jiangshi are hopping vampires from Chinese folklore. They steal the breath of the living.',
            hunting_threshold: 50,
            hunt_duration: 50,
            unique_trait: 'Unique hopping movement; attracted to breathing sounds'
        }
    };

    // ============================================================
    // LOCATION TEMPLATES (12 Types)
    // ============================================================
    
    const LOCATION_TYPES = {
        suburban_home: {
            id: 'suburban_home',
            name: 'Suburban Home',
            icon: '🏠',
            description: 'A typical family home with a dark secret in its history.',
            rooms: ['living_room', 'kitchen', 'bedroom_master', 'bedroom_guest', 'bathroom', 'basement', 'garage', 'attic'],
            size: 'small',
            hazard_chance: 0.3,
            ghost_types: ['poltergeist', 'spirit', 'shade', 'phantom', 'mare', 'yurei', 'myling'],
            common_evidence: ['emf_level_5', 'spirit_box', 'ghost_orb'],
            atmosphere: 'familiar_unease',
            loot_table: ['family_photo', 'old_diary', 'broken_toy', 'religious_item']
        },
        
        abandoned_asylum: {
            id: 'abandoned_asylum',
            name: 'Abandoned Asylum',
            icon: '🏥',
            description: 'A decaying mental institution filled with suffering and dark experiments.',
            rooms: ['patient_ward', 'operating_theater', 'morgue', 'restraint_room', 'admin_office', 'pharmacy', 'basement_corridors', 'electrotherapy_room'],
            size: 'large',
            hazard_chance: 0.6,
            ghost_types: ['revenant', 'wraith', 'oni', 'moroi', 'deogen', 'thaye', 'the_mimic'],
            common_evidence: ['emf_level_5', 'ghost_writing', 'ultraviolet', 'freezing_temps'],
            atmosphere: 'madness_echoes',
            loot_table: ['patient_records', 'medical_equipment', 'experimental_notes', 'restraint_belt']
        },
        
        historic_hotel: {
            id: 'historic_hotel',
            name: 'Historic Hotel',
            icon: '🏨',
            description: 'A grand old hotel with a history of mysterious disappearances.',
            rooms: ['lobby', 'elevator_shaft', 'guest_room', 'penthouse_suite', 'kitchen', 'service_tunnels', 'ballroom', 'maintenance_room'],
            size: 'large',
            hazard_chance: 0.4,
            ghost_types: ['phantom', 'banshee', 'wraith', 'mare', 'goryo', 'twins', 'obake'],
            common_evidence: ['fingerprints', 'ghost_orb', 'dots_projector', 'spirit_box'],
            atmosphere: 'decadent_decay',
            loot_table: ['room_key', 'hotel_register', 'expensive_item', 'old_newspaper']
        },
        
        cemetery: {
            id: 'cemetery',
            name: 'Cemetery',
            icon: '⚰️',
            description: 'An ancient burial ground where the veil between worlds is thin.',
            rooms: ['entrance_gate', 'mausoleum', 'crypt', 'gravesite_old', 'gravesite_new', 'chapel', 'caretaker_shed', 'underground_tunnel'],
            size: 'medium',
            hazard_chance: 0.4,
            ghost_types: ['shade', 'spirit', 'revenant', 'yurei', 'hantu', 'jiangshi', 'onryo'],
            common_evidence: ['emf_level_5', 'freezing_temps', 'ghost_orb', 'ghost_writing'],
            atmosphere: 'restless_dead',
            loot_table: ['funeral_item', 'grave_offering', 'burial_record', 'religious_artifact']
        },
        
        forest_cabin: {
            id: 'forest_cabin',
            name: 'Forest Cabin',
            icon: '🏕️',
            description: 'An isolated cabin surrounded by ancient woods and isolation.',
            rooms: ['main_room', 'bedroom_loft', 'basement_root_cellar', 'woodshed', 'porch', 'surrounding_woods', 'lake_shore', 'hunting_blind'],
            size: 'small',
            hazard_chance: 0.5,
            ghost_types: ['wendigo', 'skinwalker', 'mare', 'shadow_person', 'yokai', 'raiju', 'oni'],
            common_evidence: ['emf_level_5', 'freezing_temps', 'spirit_box', 'ghost_orb'],
            atmosphere: 'primal_fear',
            loot_table: ['hunting_gear', 'survival_supplies', 'old_map', 'cabin_journal']
        },
        
        underground_bunker: {
            id: 'underground_bunker',
            name: 'Underground Bunker',
            icon: '🛡️',
            description: 'A Cold War-era bunker buried deep underground.',
            rooms: ['command_center', 'barracks', 'storage_room', 'generator_room', 'decontamination', 'air_shaft', 'sealed_chamber', 'escape_tunnel'],
            size: 'medium',
            hazard_chance: 0.5,
            ghost_types: ['demon', 'wraith', 'revenant', 'the_mimic', 'moroi', 'jinn', 'thaye'],
            common_evidence: ['emf_level_5', 'ultraviolet', 'ghost_writing', 'freezing_temps'],
            atmosphere: 'claustrophobic_dread',
            loot_table: ['military_gear', 'classified_documents', 'emergency_supplies', 'radiation_badge']
        },
        
        school: {
            id: 'school',
            name: 'Abandoned School',
            icon: '🏫',
            description: 'A deserted school with echoes of childhood trauma.',
            rooms: ['classroom', 'gymnasium', 'cafeteria', 'principal_office', 'library', 'boiler_room', 'nurses_office', 'playground'],
            size: 'large',
            hazard_chance: 0.4,
            ghost_types: ['poltergeist', 'myling', 'yurei', 'shade', 'obake', 'onryo', 'goryo'],
            common_evidence: ['ghost_orb', 'spirit_box', 'ghost_writing', 'fingerprints'],
            atmosphere: 'innocence_lost',
            loot_table: ['school_records', 'childhood_item', 'textbook', 'art_project']
        },
        
        hospital: {
            id: 'hospital',
            name: 'Abandoned Hospital',
            icon: '🏥',
            description: 'A derelict hospital filled with medical equipment and pain.',
            rooms: ['emergency_room', 'operating_theater', 'icu', 'morgue', 'radiology', 'pharmacy', 'patient_room', 'maintenance'],
            size: 'large',
            hazard_chance: 0.5,
            ghost_types: ['banshee', 'wraith', 'revenant', 'deogen', 'hantu', 'moroi', 'demon'],
            common_evidence: ['freezing_temps', 'emf_level_5', 'ghost_orb', 'ultraviolet'],
            atmosphere: 'clinical_horror',
            loot_table: ['medical_records', 'surgical_tools', 'medication', 'x_ray']
        },
        
        prison: {
            id: 'prison',
            name: 'Abandoned Prison',
            icon: '⛓️',
            description: 'A maximum-security prison where violence and despair still linger.',
            rooms: ['cell_block_a', 'cell_block_b', 'solitary_confinement', 'execution_chamber', 'visitation', 'laundry_room', 'kitchen', 'warden_office'],
            size: 'large',
            hazard_chance: 0.6,
            ghost_types: ['demon', 'revenant', 'wraith', 'oni', 'skinwalker', 'wendigo', 'pontianak'],
            common_evidence: ['ultraviolet', 'emf_level_5', 'ghost_writing', 'freezing_temps'],
            atmosphere: 'institutional_malice',
            loot_table: ['inmate_records', 'contraband', 'guard_equipment', 'execution_document']
        },
        
        theater: {
            id: 'theater',
            name: 'Old Theater',
            icon: '🎭',
            description: 'A Victorian-era theater haunted by performers of the past.',
            rooms: ['main_stage', 'auditorium', 'dressing_room', 'prop_storage', 'orchestra_pit', 'lighting_booth', 'basement_workshop', 'balcony'],
            size: 'medium',
            hazard_chance: 0.3,
            ghost_types: ['phantom', 'banshee', 'twins', 'the_mimic', 'obake', 'yokai', 'goryo'],
            common_evidence: ['dots_projector', 'spirit_box', 'fingerprints', 'ghost_orb'],
            atmosphere: 'performance_anxiety',
            loot_table: ['costume_piece', 'play_script', 'stage_prop', 'performance_photo']
        },
        
        mansion: {
            id: 'mansion',
            name: 'Victorian Mansion',
            icon: '🏰',
            description: 'An ornate mansion hiding generations of family secrets.',
            rooms: ['foyer', 'grand_ballroom', 'master_suite', 'servants_quarters', 'library', 'wine_cellar', 'attic_storage', 'greenhouse'],
            size: 'large',
            hazard_chance: 0.4,
            ghost_types: ['phantom', 'banshee', 'wraith', 'demon', 'yurei', 'thaye', 'pontianak'],
            common_evidence: ['fingerprints', 'ghost_orb', 'dots_projector', 'freezing_temps'],
            atmosphere: 'gothic_opulence',
            loot_table: ['family_heirloom', 'antique', 'portrait', 'family_journal']
        },
        
        church: {
            id: 'church',
            name: 'Abandoned Church',
            icon: '⛪',
            description: 'A desecrated church where holy ground has been corrupted.',
            rooms: ['sanctuary', 'confessional', 'bell_tower', 'priest_quarters', 'crypt', 'sacristy', 'courtyard', 'basement_reliquary'],
            size: 'medium',
            hazard_chance: 0.5,
            ghost_types: ['demon', 'spirit', 'shade', 'onryo', 'onryo_vengeful', 'moroi', 'demon'],
            common_evidence: ['emf_level_5', 'freezing_temps', 'spirit_box', 'ghost_writing'],
            atmosphere: 'sacrilege',
            loot_table: ['religious_text', 'holy_symbol', 'communion_item', 'confession_record']
        }
    };

    // ============================================================
    // EQUIPMENT DATABASE
    // ============================================================
    
    const EQUIPMENT_DATABASE = {
        // Detection Equipment
        emf_reader: {
            id: 'emf_reader',
            name: 'EMF Reader',
            category: 'detection',
            tier: 1,
            cost: 100,
            icon: '📟',
            description: 'Detects electromagnetic field fluctuations. Beeps faster near ghost activity.',
            detection_type: 'emf_level_5',
            accuracy: 0.8,
            range: 5,
            battery_drain: 0.5,
            unlock_level: 1
        },
        
        emf_reader_pro: {
            id: 'emf_reader_pro',
            name: 'Professional EMF',
            category: 'detection',
            tier: 2,
            cost: 350,
            icon: '📡',
            description: 'Advanced EMF detection with digital display and logging.',
            detection_type: 'emf_level_5',
            accuracy: 0.95,
            range: 8,
            battery_drain: 0.7,
            unlock_level: 5
        },
        
        spirit_box: {
            id: 'spirit_box',
            name: 'Spirit Box',
            category: 'detection',
            tier: 1,
            cost: 150,
            icon: '📻',
            description: 'Allows communication with ghosts through white noise. Ask questions and listen for responses.',
            detection_type: 'spirit_box',
            accuracy: 0.75,
            range: 3,
            battery_drain: 1.0,
            unlock_level: 1
        },
        
        spirit_box_pro: {
            id: 'spirit_box_pro',
            name: 'SBox Ghost Scanner',
            category: 'detection',
            tier: 2,
            cost: 400,
            icon: '📱',
            description: 'Digital spirit box with text display and improved response clarity.',
            detection_type: 'spirit_box',
            accuracy: 0.9,
            range: 5,
            battery_drain: 1.2,
            unlock_level: 6
        },
        
        thermometer: {
            id: 'thermometer',
            name: 'Thermometer',
            category: 'detection',
            tier: 1,
            cost: 80,
            icon: '🌡️',
            description: 'Measures temperature. Ghosts cause freezing temperatures.',
            detection_type: 'freezing_temps',
            accuracy: 0.85,
            range: 6,
            battery_drain: 0.3,
            unlock_level: 1
        },
        
        thermal_camera: {
            id: 'thermal_camera',
            name: 'Thermal Camera',
            category: 'detection',
            tier: 2,
            cost: 500,
            icon: '📷',
            description: 'Visual thermal imaging. See cold spots and ghost manifestations.',
            detection_type: 'freezing_temps',
            accuracy: 0.95,
            range: 15,
            battery_drain: 2.0,
            unlock_level: 8
        },
        
        dots_projector: {
            id: 'dots_projector',
            name: 'D.O.T.S. Projector',
            category: 'detection',
            tier: 2,
            cost: 300,
            icon: '🔦',
            description: 'Projects laser grid that ghosts can interact with. Some ghosts only appear through DOTS.',
            detection_type: 'dots_projector',
            accuracy: 0.8,
            range: 7,
            battery_drain: 1.5,
            unlock_level: 4
        },
        
        motion_sensor: {
            id: 'motion_sensor',
            name: 'Motion Sensor',
            category: 'detection',
            tier: 1,
            cost: 120,
            icon: '📶',
            description: 'Detects movement in an area. Useful for tracking ghost movement patterns.',
            detection_type: 'movement',
            accuracy: 0.9,
            range: 8,
            battery_drain: 0.4,
            unlock_level: 2
        },
        
        parabolic_mic: {
            id: 'parabolic_mic',
            name: 'Parabolic Microphone',
            category: 'detection',
            tier: 2,
            cost: 250,
            icon: '🎤',
            description: 'Long-range audio detection. Picks up ghost sounds from a distance.',
            detection_type: 'audio',
            accuracy: 0.85,
            range: 20,
            battery_drain: 0.8,
            unlock_level: 5
        },
        
        quantum_detector: {
            id: 'quantum_detector',
            name: 'Quantum Detector',
            category: 'detection',
            tier: 3,
            cost: 1500,
            icon: '⚛️',
            description: 'Cutting-edge quantum field detection. Pinpoints exact ghost location.',
            detection_type: 'all',
            accuracy: 0.98,
            range: 15,
            battery_drain: 3.0,
            unlock_level: 15
        },
        
        // Documentation Equipment
        photo_camera: {
            id: 'photo_camera',
            name: 'Photo Camera',
            category: 'documentation',
            tier: 1,
            cost: 100,
            icon: '📸',
            description: 'Basic camera for capturing ghost orbs and interactions.',
            quality: 0.7,
            photos: 5,
            value_multiplier: 1.0,
            unlock_level: 1
        },
        
        video_camera: {
            id: 'video_camera',
            name: 'Video Camera',
            category: 'documentation',
            tier: 2,
            cost: 350,
            icon: '🎥',
            description: 'Night vision video camera for continuous recording. Can be set up on tripod.',
            quality: 0.85,
            night_vision: true,
            value_multiplier: 1.5,
            unlock_level: 3
        },
        
        dslr_camera: {
            id: 'dslr_camera',
            name: 'DSLR Camera',
            category: 'documentation',
            tier: 2,
            cost: 450,
            icon: '📷',
            description: 'High-quality camera with better detail capture.',
            quality: 0.9,
            photos: 10,
            value_multiplier: 2.0,
            unlock_level: 6
        },
        
        spectral_camera: {
            id: 'spectral_camera',
            name: 'Spectral Camera',
            category: 'documentation',
            tier: 3,
            cost: 1200,
            icon: '📸',
            description: 'Captures images from multiple spectrums simultaneously.',
            quality: 1.0,
            photos: 15,
            value_multiplier: 3.0,
            special: 'reveal_hidden',
            unlock_level: 12
        },
        
        ghost_writing_book: {
            id: 'ghost_writing_book',
            name: 'Ghost Writing Book',
            category: 'documentation',
            tier: 1,
            cost: 50,
            icon: '📖',
            description: 'Some ghosts will write in this book when left alone.',
            detection_type: 'ghost_writing',
            quality: 0.8,
            value_multiplier: 1.0,
            unlock_level: 1
        },
        
        uv_flashlight: {
            id: 'uv_flashlight',
            name: 'UV Flashlight',
            category: 'documentation',
            tier: 1,
            cost: 80,
            icon: '🔦',
            description: 'Reveals ultraviolet fingerprints and footprints left by ghosts.',
            detection_type: 'ultraviolet',
            quality: 0.8,
            value_multiplier: 1.0,
            unlock_level: 1
        },
        
        uv_camera: {
            id: 'uv_camera',
            name: 'UV Camera',
            category: 'documentation',
            tier: 2,
            cost: 400,
            icon: '📷',
            description: 'Takes photos in ultraviolet spectrum.',
            detection_type: 'ultraviolet',
            quality: 0.9,
            photos: 8,
            value_multiplier: 1.8,
            unlock_level: 7
        },
        
        audio_recorder: {
            id: 'audio_recorder',
            name: 'Audio Recorder',
            category: 'documentation',
            tier: 1,
            cost: 90,
            icon: '🎙️',
            description: 'Records EVP (Electronic Voice Phenomena) sessions.',
            detection_type: 'audio',
            quality: 0.75,
            value_multiplier: 1.2,
            unlock_level: 2
        },
        
        // Protection Equipment
        crucifix: {
            id: 'crucifix',
            name: 'Crucifix',
            category: 'protection',
            tier: 1,
            cost: 60,
            icon: '✝️',
            description: 'Prevents ghosts from hunting when nearby. Limited uses.',
            protection_type: 'hunt_prevention',
            range: 3,
            uses: 2,
            effectiveness: 0.8,
            unlock_level: 1
        },
        
        crucifix_large: {
            id: 'crucifix_large',
            name: 'Large Crucifix',
            category: 'protection',
            tier: 2,
            cost: 200,
            icon: '⛪',
            description: 'More powerful crucifix with extended range.',
            protection_type: 'hunt_prevention',
            range: 5,
            uses: 3,
            effectiveness: 0.95,
            unlock_level: 5
        },
        
        smudge_sticks: {
            id: 'smudge_sticks',
            name: 'Smudge Sticks',
            category: 'protection',
            tier: 1,
            cost: 40,
            icon: '🌿',
            description: 'Burn near ghost to temporarily stop hunting and reduce activity.',
            protection_type: 'activity_reduction',
            range: 6,
            duration: 90,
            effectiveness: 0.7,
            unlock_level: 1
        },
        
        sage_bundle: {
            id: 'sage_bundle',
            name: 'Blessed Sage Bundle',
            category: 'protection',
            tier: 2,
            cost: 150,
            icon: '🌾',
            description: 'Blessed sage with longer duration and stronger effect.',
            protection_type: 'activity_reduction',
            range: 8,
            duration: 180,
            effectiveness: 0.9,
            unlock_level: 6
        },
        
        holy_water: {
            id: 'holy_water',
            name: 'Holy Water',
            category: 'protection',
            tier: 1,
            cost: 50,
            icon: '💧',
            description: 'Throw at ghost to temporarily weaken it and slow movement.',
            protection_type: 'ghost_weakening',
            range: 8,
            duration: 30,
            effectiveness: 0.6,
            unlock_level: 2
        },
        
        salt: {
            id: 'salt',
            name: 'Salt',
            category: 'protection',
            tier: 1,
            cost: 30,
            icon: '🧂',
            description: 'Place on floor to slow ghost movement and prevent teleportation.',
            protection_type: 'movement_hindrance',
            range: 2,
            uses: 3,
            effectiveness: 0.7,
            unlock_level: 1
        },
        
        iron_shavings: {
            id: 'iron_shavings',
            name: 'Iron Shavings',
            category: 'protection',
            tier: 2,
            cost: 120,
            icon: '⚙️',
            description: 'More effective than salt. Particularly effective against certain ghosts.',
            protection_type: 'movement_hindrance',
            range: 3,
            uses: 3,
            effectiveness: 0.85,
            unlock_level: 4
        },
        
        protection_amulet: {
            id: 'protection_amulet',
            name: 'Protection Amulet',
            category: 'protection',
            tier: 3,
            cost: 800,
            icon: '📿',
            description: 'Personal protection that prevents sanity drain when held.',
            protection_type: 'sanity_protection',
            range: 0,
            duration: -1, // Passive
            effectiveness: 0.9,
            unlock_level: 10
        },
        
        blessed_candle: {
            id: 'blessed_candle',
            name: 'Blessed Candle',
            category: 'protection',
            tier: 2,
            cost: 100,
            icon: '🕯️',
            description: 'Provides light and protection. Some ghosts are repelled by flames.',
            protection_type: 'light_protection',
            range: 4,
            duration: 300,
            effectiveness: 0.75,
            unlock_level: 3
        },
        
        // Containment Equipment
        ghost_trap: {
            id: 'ghost_trap',
            name: 'Ghost Trap',
            category: 'containment',
            tier: 1,
            cost: 500,
            icon: '📦',
            description: 'Portable containment device. Weaken ghost significantly before use.',
            capacity: 50,
            success_chance: 0.4,
            range: 4,
            unlock_level: 8
        },
        
        ghost_trap_pro: {
            id: 'ghost_trap_pro',
            name: 'Advanced Ghost Trap',
            category: 'containment',
            tier: 2,
            cost: 1200,
            icon: '📦',
            description: 'Upgraded trap with better containment field and higher success rate.',
            capacity: 100,
            success_chance: 0.6,
            range: 6,
            unlock_level: 12
        },
        
        containment_unit: {
            id: 'containment_unit',
            name: 'Portable Containment Unit',
            category: 'containment',
            tier: 3,
            cost: 2500,
            icon: '🗃️',
            description: 'Heavy containment device. Extremely effective but requires setup time.',
            capacity: 200,
            success_chance: 0.8,
            range: 8,
            setup_time: 10,
            unlock_level: 18
        },
        
        spirit_cage: {
            id: 'spirit_cage',
            name: 'Spirit Cage',
            category: 'containment',
            tier: 2,
            cost: 800,
            icon: '⛓️',
            description: 'Traditional containment device. Effective against spirits but not demons.',
            capacity: 75,
            success_chance: 0.65,
            range: 5,
            bonus_vs: ['spirit', 'shade', 'yurei'],
            unlock_level: 10
        },
        
        demon_vessel: {
            id: 'demon_vessel',
            name: 'Blessed Demon Vessel',
            category: 'containment',
            tier: 3,
            cost: 3000,
            icon: '🏺',
            description: 'Ancient vessel designed specifically for demonic entities.',
            capacity: 150,
            success_chance: 0.75,
            range: 6,
            bonus_vs: ['demon', 'oni', 'pontianak'],
            unlock_level: 20
        }
    };

    // ============================================================
    // EMPLOYEE TEMPLATES
    // ============================================================
    
    const EMPLOYEE_TEMPLATES = {
        researcher: {
            role: 'Researcher',
            icon: '📚',
            description: 'Specializes in gathering information and identifying ghosts.',
            base_salary: 1500,
            skills: {
                research: 0.8,
                identification: 0.7,
                field_work: 0.3,
                exorcism: 0.2
            },
            traits: ['analytical', 'cautious', 'knowledgeable']
        },
        
        investigator: {
            role: 'Field Investigator',
            icon: '🔦',
            description: 'Experienced in field work and evidence collection.',
            base_salary: 2000,
            skills: {
                research: 0.4,
                identification: 0.6,
                field_work: 0.85,
                exorcism: 0.3
            },
            traits: ['brave', 'adaptable', 'observant']
        },
        
        technician: {
            role: 'Equipment Technician',
            icon: '🔧',
            description: 'Expert in equipment maintenance and operation.',
            base_salary: 1800,
            skills: {
                research: 0.3,
                identification: 0.5,
                field_work: 0.6,
                exorcism: 0.2
            },
            bonus_equipment: 0.2,
            traits: ['technical', 'precise', 'resourceful']
        },
        
        exorcist: {
            role: 'Exorcist',
            icon: '✝️',
            description: 'Trained in spiritual warfare and entity removal.',
            base_salary: 3000,
            skills: {
                research: 0.3,
                identification: 0.4,
                field_work: 0.5,
                exorcism: 0.95
            },
            traits: ['spiritual', 'determined', 'fearless']
        },
        
        medium: {
            role: 'Medium',
            icon: '🔮',
            description: 'Can sense and communicate with spirits naturally.',
            base_salary: 2500,
            skills: {
                research: 0.5,
                identification: 0.9,
                field_work: 0.6,
                exorcism: 0.7
            },
            traits: ['sensitive', 'intuitive', 'fragile'],
            special_ability: 'natural_sight'
        },
        
        security: {
            role: 'Security Specialist',
            icon: '🛡️',
            description: 'Provides physical protection during investigations.',
            base_salary: 2200,
            skills: {
                research: 0.2,
                identification: 0.3,
                field_work: 0.75,
                exorcism: 0.4
            },
            bonus_protection: 0.3,
            traits: ['protective', 'strong', 'alert']
        }
    };

    // ============================================================
    // CONTRACT TEMPLATES
    // ============================================================
    
    const CONTRACT_TEMPLATES = [
        {
            type: CONTRACT_TYPES.INVESTIGATION,
            description_templates: [
                "Strange noises heard in {location} at night",
                "Objects moving on their own in {location}",
                "Family reports feeling watched in {location}",
                "Unexplained cold spots in {location}",
                "Shadow figures seen in {location}"
            ],
            base_reward: 500,
            difficulty_multiplier: 1.0,
            time_limit: 3
        },
        {
            type: CONTRACT_TYPES.DOCUMENTATION,
            description_templates: [
                "Need photographic evidence of activity in {location}",
                "Client requires video proof of haunting in {location}",
                "Document all paranormal activity in {location}",
                "Gather comprehensive evidence from {location}",
                "Record EVP and capture images in {location}"
            ],
            base_reward: 750,
            difficulty_multiplier: 1.3,
            time_limit: 2
        },
        {
            type: CONTRACT_TYPES.CONTAINMENT,
            description_templates: [
                "Dangerous entity in {location} must be captured",
                "Violent ghost in {location} needs containment",
                "Hostile spirit in {location} requires trapping",
                "Aggressive entity in {location} must be secured",
                "Dangerous manifestation in {location} needs capture"
            ],
            base_reward: 1500,
            difficulty_multiplier: 1.8,
            time_limit: 1
        },
        {
            type: CONTRACT_TYPES.EXORCISM,
            description_templates: [
                "Demonic presence in {location} requires immediate exorcism",
                "Possession case in {location} - exorcist needed",
                "Dark entity in {location} must be banished",
                "Malevolent spirit in {location} requires exorcism",
                "Demonic infestation in {location} - urgent response needed"
            ],
            base_reward: 2500,
            difficulty_multiplier: 2.5,
            time_limit: 1
        },
        {
            type: CONTRACT_TYPES.CONSULTATION,
            description_templates: [
                "Client needs advice about activity in {location}",
                "Homeowner seeks consultation for {location}",
                "Second opinion needed on {location} haunting",
                "Advice requested for protective measures in {location}",
                "Consultation needed before investigation of {location}"
            ],
            base_reward: 300,
            difficulty_multiplier: 0.6,
            time_limit: 1
        }
    ];

    // ============================================================
    // GAME STATE
    // ============================================================
    
    let gameState = {
        version: VERSION,
        mode: GAME_MODES.CAREER,
        permadeath: false,
        
        // Business State
        business: {
            name: 'Paranormal Solutions Inc.',
            funds: 5000,
            reputation: 0,
            rating: 3.0,
            founded: null,
            day: 1,
            completed_contracts: 0,
            failed_contracts: 0,
            total_earnings: 0,
            discovered_ghosts: new Set(),
            upgrades: {
                research_lab: false,
                containment_cell: false,
                training_room: false,
                equipment_storage: 1,
                security_system: false,
                vehicle: 'basic_van'
            }
        },
        
        // Employees
        employees: [],
        max_employees: 4,
        
        // Equipment Inventory
        inventory: {
            detection: ['emf_reader', 'spirit_box', 'thermometer'],
            documentation: ['photo_camera', 'ghost_writing_book', 'uv_flashlight'],
            protection: ['crucifix', 'smudge_sticks', 'salt'],
            containment: []
        },
        
        // Contracts
        contracts: [],
        active_contract: null,
        completed_contracts_history: [],
        
        // Current Investigation
        investigation: {
            active: false,
            location: null,
            ghost: null,
            evidence_collected: [],
            photos_taken: [],
            time_elapsed: 0,
            player_sanity: 100,
            team_status: [],
            objectives_completed: [],
            ghost_identified: false,
            ghost_correctly_identified: false
        },
        
        // Evidence Board
        evidence_board: {
            clues: [],
            connections: []
        },
        
        // Statistics
        statistics: {
            ghosts_identified: 0,
            ghosts_contained: 0,
            ghosts_exorcised: 0,
            evidence_collected: 0,
            photos_taken: 0,
            investigations_completed: 0,
            sanity_lost: 0,
            deaths: 0,
            equipment_destroyed: 0,
            favorite_equipment: {}
        },
        
        // Settings
        settings: {
            sound_volume: 0.8,
            music_volume: 0.5,
            mouse_sensitivity: 1.0,
            invert_mouse: false,
            field_of_view: 90,
            graphics_quality: 'high',
            show_tutorials: true
        }
    };

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    
    function generateId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    
    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    function randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    function formatCurrency(amount) {
        return '$' + amount.toLocaleString();
    }
    
    function calculateDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
    
    function lerp(start, end, t) {
        return start + (end - start) * t;
    }
    
    function generateName() {
        const firstNames = ['Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Taylor', 'Quinn', 'Avery', 'Sam', 'Dakota',
            'Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn',
            'James', 'William', 'Benjamin', 'Lucas', 'Henry', 'Alexander', 'Daniel', 'Matthew', 'Jackson', 'Sebastian',
            'Harper', 'Evelyn', 'Abigail', 'Emily', 'Elizabeth', 'Mila', 'Ella', 'Avery', 'Sofia', 'Camila'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
            'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
            'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];
        return randomChoice(firstNames) + ' ' + randomChoice(lastNames);
    }
    
    // ============================================================
    // INITIALIZATION
    // ============================================================
    
    function initGame() {
        console.log('[Paranormal Contractor] Initializing v' + VERSION);
        
        // Initialize audio
        if (typeof HorrorAudio !== 'undefined') {
            HorrorAudio.init();
        }
        
        // Initialize GameUtils
        if (typeof GameUtils !== 'undefined') {
            GameUtils.initPause({
                gameId: 'paranormal-contractor',
                onResume: onResumeGame,
                onRestart: onRestartGame
            });
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Check for save data
        loadGame();
        
        // Generate initial contracts
        generateContracts(5);
        
        console.log('[Paranormal Contractor] Initialization complete');
    }
    
    function setupEventListeners() {
        // Start screen
        document.getElementById('start-btn').addEventListener('click', startGame);
        
        // Game mode selection
        document.querySelectorAll('.pc-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.pc-mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                gameState.mode = e.target.dataset.mode;
            });
        });
        
        // Permadeath toggle
        document.getElementById('permadeath-toggle').addEventListener('click', (e) => {
            e.target.classList.toggle('active');
            gameState.permadeath = e.target.classList.contains('active');
        });
        
        // Navigation
        document.querySelectorAll('.pc-nav-btn[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                switchView(view);
            });
        });
        
        // Equipment filters
        document.querySelectorAll('[data-equip-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.equipFilter;
                filterEquipment(filter);
            });
        });
        
        // Ghost search
        document.getElementById('ghost-search')?.addEventListener('input', (e) => {
            searchGhosts(e.target.value);
        });
        
        // Hire employee
        document.getElementById('hire-employee-btn')?.addEventListener('click', showHireModal);
        
        // Start investigation
        document.getElementById('investigate-btn')?.addEventListener('click', startInvestigation);
        
        // Modal close
        document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') {
                closeModal();
            }
        });
    }

    // ============================================================
    // GAME FLOW FUNCTIONS
    // ============================================================
    
    function startGame() {
        console.log('[Paranormal Contractor] Starting game in ' + gameState.mode + ' mode');
        
        // Hide start screen
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('game-header').style.display = 'flex';
        document.getElementById('main-content').style.display = 'flex';
        
        // Set initial business founded date
        if (!gameState.business.founded) {
            gameState.business.founded = new Date().toISOString();
        }
        
        // Initialize UI
        updateHeaderStats();
        renderOfficeView();
        renderContracts();
        renderEquipment();
        renderGhostDatabase();
        renderEmployees();
        renderEvidenceBoard();
        renderMap();
        
        // Play start sound
        if (typeof HorrorAudio !== 'undefined') {
            HorrorAudio.playClick();
        }
        
        // Save game
        saveGame();
        
        // Set game state
        if (typeof GameUtils !== 'undefined') {
            GameUtils.setState(GameUtils.STATE.PLAYING);
        }
    }
    
    function onResumeGame() {
        console.log('[Paranormal Contractor] Game resumed');
        if (gameState.investigation.active) {
            resumeInvestigation();
        }
    }
    
    function onRestartGame() {
        console.log('[Paranormal Contractor] Game restarted');
        localStorage.removeItem(SAVE_KEY);
        location.reload();
    }
    
    function switchView(viewName) {
        // Update nav buttons
        document.querySelectorAll('.pc-nav-btn[data-view]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === viewName) {
                btn.classList.add('active');
            }
        });
        
        // Update view display
        document.querySelectorAll('.pc-view').forEach(view => {
            view.classList.remove('active');
        });
        
        const targetView = document.getElementById('view-' + viewName);
        if (targetView) {
            targetView.classList.add('active');
        }
        
        // Play sound
        if (typeof HorrorAudio !== 'undefined') {
            HorrorAudio.playClick();
        }
        
        // Refresh view content
        switch (viewName) {
            case 'office':
                renderOfficeView();
                break;
            case 'contracts':
                renderContracts();
                break;
            case 'equipment':
                renderEquipment();
                break;
            case 'ghosts':
                renderGhostDatabase();
                break;
            case 'employees':
                renderEmployees();
                break;
            case 'evidence':
                renderEvidenceBoard();
                break;
            case 'map':
                renderMap();
                break;
        }
    }

    // ============================================================
    // CONTRACT SYSTEM
    // ============================================================
    
    function generateContracts(count = 5) {
        const locationIds = Object.keys(LOCATION_TYPES);
        
        for (let i = 0; i < count; i++) {
            const template = randomChoice(CONTRACT_TEMPLATES);
            const locationId = randomChoice(locationIds);
            const location = LOCATION_TYPES[locationId];
            const difficulty = randomInt(1, 5);
            
            const description = randomChoice(template.description_templates)
                .replace('{location}', location.name);
            
            const contract = {
                id: generateId(),
                type: template.type,
                description: description,
                location: locationId,
                difficulty: difficulty,
                reward: Math.floor(template.base_reward * template.difficulty_multiplier * (1 + (difficulty - 1) * 0.3)),
                time_limit: template.time_limit,
                client: generateClient(),
                created: Date.now(),
                expires: Date.now() + (template.time_limit * 24 * 60 * 60 * 1000),
                status: 'available',
                ghost_type_hint: randomChoice(location.ghost_types)
            };
            
            gameState.contracts.push(contract);
        }
        
        // Sort by difficulty
        gameState.contracts.sort((a, b) => a.difficulty - b.difficulty);
    }
    
    function generateClient() {
        const prefixes = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Pastor', 'Father'];
        const descriptors = ['concerned', 'desperate', 'frightened', 'skeptical', 'desperate', 'terrified'];
        
        return {
            name: randomChoice(prefixes) + ' ' + generateName().split(' ')[1],
            descriptor: randomChoice(descriptors),
            trust: randomInt(50, 100),
            patience: randomInt(30, 80)
        };
    }
    
    function acceptContract(contractId) {
        const contract = gameState.contracts.find(c => c.id === contractId);
        if (!contract) return false;
        
        if (gameState.active_contract) {
            showModal('Contract Active', 'You already have an active contract. Complete or abandon it first.');
            return false;
        }
        
        gameState.active_contract = contract;
        contract.status = 'active';
        
        // Update UI
        renderContracts();
        updateHeaderStats();
        
        // Show notification
        showNotification('Contract Accepted', `You have accepted: ${contract.description}`);
        
        return true;
    }
    
    function completeContract(success, bonus = 0) {
        if (!gameState.active_contract) return;
        
        const contract = gameState.active_contract;
        contract.status = success ? 'completed' : 'failed';
        contract.completed_at = Date.now();
        
        if (success) {
            const totalReward = contract.reward + bonus;
            gameState.business.funds += totalReward;
            gameState.business.reputation += contract.difficulty * 5;
            gameState.business.completed_contracts++;
            gameState.business.total_earnings += totalReward;
            
            // Rating boost
            gameState.business.rating = clamp(
                gameState.business.rating + 0.1,
                1,
                5
            );
            
            showNotification('Contract Completed!', `Earned ${formatCurrency(totalReward)}`);
            
            if (typeof HorrorAudio !== 'undefined') {
                HorrorAudio.playWin();
            }
        } else {
            gameState.business.reputation -= 5;
            gameState.business.failed_contracts++;
            gameState.business.rating = clamp(
                gameState.business.rating - 0.2,
                1,
                5
            );
            
            showNotification('Contract Failed', 'Your reputation has decreased');
        }
        
        // Move to history
        gameState.completed_contracts_history.push(contract);
        gameState.contracts = gameState.contracts.filter(c => c.id !== contract.id);
        gameState.active_contract = null;
        
        // Generate new contract
        generateContracts(1);
        
        // Update UI
        updateHeaderStats();
        renderContracts();
        renderOfficeView();
        
        // Save
        saveGame();
    }
    
    function abandonContract() {
        if (!gameState.active_contract) return;
        
        gameState.active_contract.status = 'abandoned';
        gameState.business.reputation -= 2;
        gameState.contracts = gameState.contracts.filter(c => c.id !== gameState.active_contract.id);
        gameState.active_contract = null;
        
        generateContracts(1);
        updateHeaderStats();
        renderContracts();
        
        showNotification('Contract Abandoned', 'Your reputation has decreased');
    }

    // ============================================================
    // GHOST GENERATION & AI
    // ============================================================
    
    function generateGhostForLocation(locationId, difficulty) {
        const location = LOCATION_TYPES[locationId];
        const possibleGhosts = location.ghost_types.map(id => GHOST_TYPES[id]);
        
        // Filter by difficulty
        const suitableGhosts = possibleGhosts.filter(g => {
            const ghostDifficulty = g.danger;
            return ghostDifficulty >= difficulty - 1 && ghostDifficulty <= difficulty + 2;
        });
        
        const ghostTemplate = suitableGhosts.length > 0 
            ? randomChoice(suitableGhosts) 
            : randomChoice(possibleGhosts);
        
        // Create instance
        return {
            ...ghostTemplate,
            instanceId: generateId(),
            currentRoom: null,
            favoriteRoom: null,
            state: 'wandering', // wandering, hunting, manifested, hidden
            stateTimer: 0,
            activityLevel: randomInt(30, 70),
            aggressionLevel: ghostTemplate.aggression * 10,
            huntCooldown: 0,
            manifestationChance: 0.1,
            evidenceGiven: [],
            playerInteractions: 0,
            lastHuntTime: 0,
            currentSpeed: ghostTemplate.speed,
            position: { x: 0, y: 0 },
            targetPosition: null,
            hasHunted: false,
            huntStartTime: null,
            
            // AI behavior tracking
            learnedPatterns: {
                playerHiding: false,
                equipmentUsed: [],
                responseToCrucifix: false,
                responseToSalt: false
            },
            
            // Dynamic difficulty adjustment
            huntSuccessCount: 0,
            escapeCount: 0
        };
    }
    
    function updateGhostAI(ghost, dt, playerData, investigation) {
        ghost.stateTimer -= dt;
        ghost.huntCooldown -= dt;
        
        // Check if ghost should hunt
        if (shouldGhostHunt(ghost, playerData, investigation)) {
            startGhostHunt(ghost, playerData);
        }
        
        // State machine
        switch (ghost.state) {
            case 'wandering':
                updateGhostWandering(ghost, dt);
                break;
            case 'hunting':
                updateGhostHunting(ghost, dt, playerData);
                break;
            case 'manifested':
                updateGhostManifested(ghost, dt);
                break;
            case 'hidden':
                updateGhostHidden(ghost, dt);
                break;
        }
        
        // Activity buildup
        if (playerData.inSameRoom && ghost.state !== 'hunting') {
            ghost.activityLevel += dt * 2;
        } else {
            ghost.activityLevel -= dt * 0.5;
        }
        ghost.activityLevel = clamp(ghost.activityLevel, 0, 100);
        
        // Evidence generation chance
        if (ghost.state === 'manifested' && Math.random() < 0.3 * dt) {
            generateEvidence(ghost, investigation);
        }
    }
    
    function shouldGhostHunt(ghost, playerData, investigation) {
        if (ghost.state === 'hunting') return false;
        if (ghost.huntCooldown > 0) return false;
        if (investigation.player_sanity > ghost.hunting_threshold * 1.5) return false;
        
        // Base hunt chance
        let huntChance = 0;
        
        // Sanity factor
        const sanityFactor = 1 - (investigation.player_sanity / 100);
        huntChance += sanityFactor * 0.3;
        
        // Activity level factor
        huntChance += (ghost.activityLevel / 100) * 0.2;
        
        // Time factor (ghosts hunt more over time)
        const timeFactor = Math.min(investigation.time_elapsed / 600, 1); // 10 minutes max
        huntChance += timeFactor * 0.2;
        
        // Player behavior factor
        if (playerData.isSprinting) huntChance += 0.1;
        if (playerData.isTalking) huntChance += 0.15;
        if (playerData.inDarkness) huntChance += 0.1;
        
        // Ghost-specific modifiers
        if (ghost.id === 'demon') huntChance += 0.2; // Demons hunt more
        if (ghost.id === 'shade' && !playerData.alone) huntChance = 0; // Shades don't hunt with others
        if (ghost.id === 'mare' && playerData.inDarkness) huntChance += 0.2;
        if (ghost.id === 'oni' && playerData.groupNearby) huntChance += 0.15;
        
        return Math.random() < huntChance;
    }
    
    function startGhostHunt(ghost, playerData) {
        ghost.state = 'hunting';
        ghost.stateTimer = ghost.hunt_duration;
        ghost.huntStartTime = Date.now();
        ghost.hasHunted = true;
        ghost.huntCooldown = 30; // 30 seconds minimum between hunts
        
        // Play hunt sound
        if (typeof HorrorAudio !== 'undefined') {
            HorrorAudio.playJumpScare();
            HorrorAudio.startHeartbeat(120);
        }
        
        showNotification('⚠️ HUNT STARTED!', 'The ghost is hunting! Hide or run!', 'danger');
        
        console.log(`[Ghost AI] ${ghost.name} started hunting`);
    }
    
    function updateGhostWandering(ghost, dt) {
        if (ghost.stateTimer <= 0) {
            // Decide next state
            const rand = Math.random();
            if (rand < 0.4) {
                ghost.state = 'hidden';
                ghost.stateTimer = randomInt(10, 30);
            } else if (rand < 0.7) {
                ghost.state = 'manifested';
                ghost.stateTimer = randomInt(5, 15);
            } else {
                ghost.stateTimer = randomInt(5, 15);
            }
            
            // Move to new room
            ghost.currentRoom = randomChoice(ghost.location.rooms);
        }
        
        // Occasional interaction
        if (Math.random() < 0.1 * dt) {
            performGhostInteraction(ghost, 'minor');
        }
    }
    
    function updateGhostHunting(ghost, dt, playerData) {
        ghost.stateTimer -= dt;
        
        // Calculate hunt speed
        let speed = ghost.hunt_speed || ghost.speed;
        
        // Ghost-specific speed modifiers
        if (ghost.id === 'revenant') {
            // Revenant is slow when searching, fast when pursuing
            const distanceToPlayer = calculateDistance(
                ghost.position.x, ghost.position.y,
                playerData.position.x, playerData.position.y
            );
            speed = distanceToPlayer < 10 ? ghost.hunt_speed : ghost.speed;
        } else if (ghost.id === 'raiju' && playerData.electronicsNearby) {
            speed = ghost.hunt_speed;
        } else if (ghost.id === 'moroi') {
            // Moroi gets faster as target loses sanity
            const sanityFactor = 1 - (playerData.sanity / 100);
            speed = ghost.speed + (sanityFactor * 3);
        } else if (ghost.id === 'thaye') {
            // Thaye slows down over time
            const timeFactor = Math.min((Date.now() - ghost.instanceId) / 300000, 1);
            speed = ghost.speed * (1 - timeFactor * 0.5);
        }
        
        ghost.currentSpeed = speed;
        
        // Move toward player
        if (ghost.id === 'deogen') {
            // Deogen always knows player location
            ghost.targetPosition = { ...playerData.position };
        } else if (ghost.id === 'banshee') {
            // Banshee targets lowest sanity
            ghost.targetPosition = { ...playerData.position };
        } else {
            // Normal pursuit
            ghost.targetPosition = { ...playerData.position };
        }
        
        // End hunt if timer expires or player is caught
        if (ghost.stateTimer <= 0) {
            endGhostHunt(ghost, false);
        }
        
        // Check player catch
        const distanceToPlayer = calculateDistance(
            ghost.position.x, ghost.position.y,
            playerData.position.x, playerData.position.y
        );
        
        if (distanceToPlayer < 1.5) {
            onPlayerCaught(ghost);
        }
    }
    
    function updateGhostManifested(ghost, dt) {
        ghost.stateTimer -= dt;
        
        // Visual manifestation - player can see ghost
        if (ghost.stateTimer <= 0) {
            ghost.state = 'hidden';
            ghost.stateTimer = randomInt(10, 20);
        }
        
        // Higher interaction chance when manifested
        if (Math.random() < 0.3 * dt) {
            performGhostInteraction(ghost, 'major');
        }
    }
    
    function updateGhostHidden(ghost, dt) {
        ghost.stateTimer -= dt;
        
        // Ghost is invisible but still present
        if (ghost.stateTimer <= 0) {
            ghost.state = 'wandering';
            ghost.stateTimer = randomInt(5, 15);
        }
        
        // Very low interaction chance when hidden
        if (Math.random() < 0.05 * dt) {
            performGhostInteraction(ghost, 'subtle');
        }
    }
    
    function endGhostHunt(ghost, caughtPlayer) {
        ghost.state = 'wandering';
        ghost.stateTimer = randomInt(15, 30);
        ghost.huntCooldown = 30 + randomInt(0, 30);
        
        // Reset heartbeat
        if (typeof HorrorAudio !== 'undefined') {
            HorrorAudio.stopHeartbeat();
            HorrorAudio.startHeartbeat(70);
        }
        
        if (!caughtPlayer) {
            ghost.escapeCount++;
            console.log(`[Ghost AI] ${ghost.name} hunt ended, player escaped`);
        }
    }
    
    function onPlayerCaught(ghost) {
        console.log(`[Ghost AI] ${ghost.name} caught player!`);
        
        ghost.huntSuccessCount++;
        
        // Reduce sanity
        gameState.investigation.player_sanity -= 30;
        
        // Play death sound
        if (typeof HorrorAudio !== 'undefined') {
            HorrorAudio.playDeath();
        }
        
        // Visual effects
        if (typeof GameUtils !== 'undefined') {
            GameUtils.onPlayerDeath();
        }
        
        showNotification('💀 CAUGHT!', 'The ghost caught you! Sanity severely reduced.', 'danger');
        
        if (gameState.investigation.player_sanity <= 0) {
            onInvestigationFailed('insanity');
        } else {
            endGhostHunt(ghost, true);
            // Teleport ghost away
            ghost.state = 'hidden';
            ghost.stateTimer = 60;
        }
    }
    
    function performGhostInteraction(ghost, intensity) {
        const interactions = {
            subtle: ['footsteps', 'whisper', 'temperature_drop', 'light_flicker'],
            minor: ['door_move', 'object_sound', 'electronic_interference', 'shadow_movement'],
            major: ['object_throw', 'loud_bang', 'manifestation', 'sanity_drain']
        };
        
        const possible = interactions[intensity] || interactions.subtle;
        const interaction = randomChoice(possible);
        
        // Play appropriate sound
        if (typeof HorrorAudio !== 'undefined') {
            switch (interaction) {
                case 'footsteps':
                    HorrorAudio.playFootstep('stone');
                    break;
                case 'object_throw':
                case 'loud_bang':
                    HorrorAudio.playHit();
                    break;
                case 'whisper':
                    // Would play whisper sound
                    break;
            }
        }
        
        // Update investigation log
        addEvidence({
            type: 'interaction',
            subtype: interaction,
            ghost: ghost.id,
            time: gameState.investigation.time_elapsed,
            intensity: intensity
        });
        
        console.log(`[Ghost AI] ${ghost.name} performed ${interaction}`);
    }
    
    function generateEvidence(ghost, investigation) {
        // Determine what evidence this ghost can give
        const availableEvidence = ghost.evidence;
        const notYetCollected = availableEvidence.filter(e => 
            !ghost.evidenceGiven.includes(e)
        );
        
        if (notYetCollected.length > 0 && Math.random() < 0.3) {
            const evidence = randomChoice(notYetCollected);
            ghost.evidenceGiven.push(evidence);
            
            addEvidence({
                type: 'ghost_evidence',
                evidence_type: evidence,
                ghost: ghost.id,
                time: investigation.time_elapsed,
                quality: randomInt(60, 100)
            });
            
            showNotification('📸 Evidence Found!', `Captured ${evidence.replace(/_/g, ' ')}`, 'success');
        }
    }

    // ============================================================
    // INVESTIGATION SYSTEM
    // ============================================================
    
    function startInvestigation() {
        if (!gameState.active_contract) {
            showModal('No Active Contract', 'Please accept a contract from the Contracts tab first.');
            return;
        }
        
        const contract = gameState.active_contract;
        const location = LOCATION_TYPES[contract.location];
        
        // Generate ghost
        const ghost = generateGhostForLocation(contract.location, contract.difficulty);
        
        // Setup investigation
        gameState.investigation = {
            active: true,
            contract: contract,
            location: location,
            ghost: ghost,
            evidence_collected: [],
            photos_taken: [],
            time_elapsed: 0,
            player_sanity: 100,
            team_status: [],
            objectives_completed: [],
            ghost_identified: false,
            ghost_correctly_identified: false,
            start_time: Date.now(),
            player_position: { x: 0, y: 0, z: 0 },
            current_room: location.rooms[0],
            visited_rooms: new Set(),
            equipment_used: {},
            ghost_room: randomChoice(location.rooms),
            
            // Investigation state
            stage: 'setup', // setup, investigating, identifying, resolution
            
            // Procedural generation
            room_layout: generateRoomLayout(location),
            hazards: generateHazards(location),
            loot_items: generateLoot(location)
        };
        
        // Show controls overlay
        const controlsOverlay = document.getElementById('controls-overlay');
        if (controlsOverlay) {
            controlsOverlay.style.display = 'flex';
            setTimeout(() => {
                controlsOverlay.style.display = 'none';
                enterInvestigationMode();
            }, 5000);
        } else {
            enterInvestigationMode();
        }
        
        // Play sound
        if (typeof HorrorAudio !== 'undefined') {
            HorrorAudio.startDrone(40, 'dark');
            HorrorAudio.startHeartbeat(70);
        }
        
        console.log('[Investigation] Started investigation at ' + location.name);
    }
    
    function enterInvestigationMode() {
        switchView('investigation');
        
        // Initialize canvas
        initInvestigationCanvas();
        
        // Start investigation loop
        requestAnimationFrame(investigationLoop);
        
        // Update equipment slots
        renderEquipmentSlots();
    }
    
    function generateRoomLayout(location) {
        const layout = {};
        const rooms = [...location.rooms];
        
        // Create connections between rooms
        rooms.forEach(room => {
            layout[room] = {
                connections: [],
                items: [],
                ghost_activity: randomInt(10, 50),
                temperature: randomInt(10, 25),
                light_level: Math.random() > 0.3 ? 0.5 : 0.1
            };
        });
        
        // Connect rooms
        for (let i = 0; i < rooms.length; i++) {
            const connections = randomInt(1, 3);
            for (let j = 0; j < connections; j++) {
                const target = randomChoice(rooms);
                if (target !== rooms[i] && !layout[rooms[i]].connections.includes(target)) {
                    layout[rooms[i]].connections.push(target);
                }
            }
        }
        
        // Set ghost's favorite room
        gameState.investigation.ghost.favoriteRoom = randomChoice(rooms);
        gameState.investigation.ghost.currentRoom = gameState.investigation.ghost.favoriteRoom;
        
        return layout;
    }
    
    function generateHazards(location) {
        const hazards = [];
        const hazardTypes = [
            { type: 'unstable_floor', danger: 2, description: 'Floor may collapse' },
            { type: 'electrical', danger: 3, description: 'Exposed wiring' },
            { type: 'toxic_mold', danger: 2, description: 'Harmful mold spores' },
            { type: 'asbestos', danger: 1, description: 'Asbestos contamination' },
            { type: 'structural', danger: 4, description: 'Structural instability' }
        ];
        
        const count = Math.floor(location.rooms.length * location.hazard_chance);
        for (let i = 0; i < count; i++) {
            hazards.push({
                ...randomChoice(hazardTypes),
                room: randomChoice(location.rooms),
                discovered: false
            });
        }
        
        return hazards;
    }
    
    function generateLoot(location) {
        const loot = [];
        for (let i = 0; i < 3; i++) {
            loot.push({
                type: randomChoice(location.loot_table),
                room: randomChoice(location.rooms),
                collected: false,
                value: randomInt(50, 200)
            });
        }
        return loot;
    }
    
    let investigationCanvas, investigationCtx;
    let lastTime = 0;
    let keysPressed = {};
    let mousePosition = { x: 0, y: 0 };
    let playerRotation = 0;
    
    function initInvestigationCanvas() {
        investigationCanvas = document.getElementById('investigation-canvas');
        if (!investigationCanvas) return;
        
        investigationCanvas.width = investigationCanvas.parentElement.clientWidth;
        investigationCanvas.height = investigationCanvas.parentElement.clientHeight;
        investigationCtx = investigationCanvas.getContext('2d');
        
        // Setup controls
        document.addEventListener('keydown', (e) => {
            keysPressed[e.code] = true;
            handleInvestigationInput(e.code);
        });
        
        document.addEventListener('keyup', (e) => {
            keysPressed[e.code] = false;
        });
        
        investigationCanvas.addEventListener('mousemove', (e) => {
            const rect = investigationCanvas.getBoundingClientRect();
            mousePosition.x = e.clientX - rect.left;
            mousePosition.y = e.clientY - rect.top;
        });
        
        investigationCanvas.addEventListener('click', (e) => {
            handleInvestigationClick(e);
        });
    }
    
    function investigationLoop(timestamp) {
        if (!gameState.investigation.active) return;
        
        const dt = (timestamp - lastTime) / 1000;
        lastTime = timestamp;
        
        if (dt > 0.1) { // Cap dt to prevent huge jumps
            requestAnimationFrame(investigationLoop);
            return;
        }
        
        updateInvestigation(dt);
        renderInvestigation();
        
        requestAnimationFrame(investigationLoop);
    }
    
    function updateInvestigation(dt) {
        const investigation = gameState.investigation;
        
        // Update time
        investigation.time_elapsed += dt;
        
        // Update player position based on input
        updatePlayerMovement(dt);
        
        // Update ghost AI
        const playerData = {
            position: investigation.player_position,
            sanity: investigation.player_sanity,
            inSameRoom: investigation.current_room === investigation.ghost.currentRoom,
            isSprinting: keysPressed['ShiftLeft'] || keysPressed['ShiftRight'],
            isTalking: false, // Would be voice detection
            inDarkness: investigation.room_layout[investigation.current_room].light_level < 0.3,
            alone: true, // Would check for team members
            electronicsNearby: true // Would check for equipment
        };
        
        updateGhostAI(investigation.ghost, dt, playerData, investigation);
        
        // Sanity drain
        let sanityDrain = 0.5 * dt; // Base drain
        
        if (investigation.current_room === investigation.ghost.currentRoom) {
            sanityDrain += 2 * dt; // Ghost presence
        }
        
        if (playerData.inDarkness) {
            sanityDrain += 1 * dt; // Darkness
        }
        
        if (investigation.ghost.state === 'hunting') {
            sanityDrain += 5 * dt; // Being hunted
        }
        
        investigation.player_sanity -= sanityDrain;
        gameState.statistics.sanity_lost += sanityDrain;
        
        // Update UI
        document.getElementById('sanity-fill').style.width = investigation.player_sanity + '%';
        document.getElementById('sanity-value').textContent = Math.floor(investigation.player_sanity) + '%';
        
        // Check failure conditions
        if (investigation.player_sanity <= 0) {
            onInvestigationFailed('insanity');
            return;
        }
        
        // Check contract objectives
        checkObjectives();
        
        // Auto-complete if contract time exceeded
        const maxTime = investigation.contract.time_limit * 60 * 10; // Convert to investigation time
        if (investigation.time_elapsed > maxTime) {
            onInvestigationTimeout();
        }
    }
    
    function updatePlayerMovement(dt) {
        const speed = (keysPressed['ShiftLeft'] || keysPressed['ShiftRight']) ? 5 : 2.5;
        let dx = 0;
        let dy = 0;
        
        if (keysPressed['KeyW'] || keysPressed['ArrowUp']) dy -= 1;
        if (keysPressed['KeyS'] || keysPressed['ArrowDown']) dy += 1;
        if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) dx -= 1;
        if (keysPressed['KeyD'] || keysPressed['ArrowRight']) dx += 1;
        
        // Normalize diagonal
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }
        
        gameState.investigation.player_position.x += dx * speed * dt * 10;
        gameState.investigation.player_position.y += dy * speed * dt * 10;
        
        // Update rotation based on mouse
        const centerX = investigationCanvas.width / 2;
        const centerY = investigationCanvas.height / 2;
        playerRotation = Math.atan2(mousePosition.y - centerY, mousePosition.x - centerX);
    }
    
    function renderInvestigation() {
        if (!investigationCtx) return;
        
        const ctx = investigationCtx;
        const width = investigationCanvas.width;
        const height = investigationCanvas.height;
        const investigation = gameState.investigation;
        
        // Clear
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, width, height);
        
        // Apply sanity-based effects
        const sanity = investigation.player_sanity;
        const distortion = (100 - sanity) / 100;
        
        // Draw room
        ctx.save();
        ctx.translate(width / 2, height / 2);
        
        // Room background
        ctx.fillStyle = '#0a0a10';
        ctx.fillRect(-300, -200, 600, 400);
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-300, -200, 600, 400);
        
        // Room name
        ctx.fillStyle = '#8b5cf6';
        ctx.font = '16px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(investigation.current_room.replace(/_/g, ' ').toUpperCase(), 0, -220);
        
        // Draw connections
        const roomData = investigation.room_layout[investigation.current_room];
        roomData.connections.forEach((conn, i) => {
            const angle = (i / roomData.connections.length) * Math.PI * 2;
            const x = Math.cos(angle) * 250;
            const y = Math.sin(angle) * 150;
            
            ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
            ctx.fillRect(x - 40, y - 60, 80, 120);
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
            ctx.strokeRect(x - 40, y - 60, 80, 120);
            
            ctx.fillStyle = '#666';
            ctx.font = '10px Inter';
            ctx.fillText(conn.replace(/_/g, ' '), x, y);
        });
        
        // Draw ghost if manifested or hunting
        const ghost = investigation.ghost;
        if (ghost.state === 'manifested' || ghost.state === 'hunting') {
            const ghostAlpha = ghost.state === 'hunting' ? 0.9 : 0.5;
            const ghostX = (Math.random() - 0.5) * distortion * 10;
            const ghostY = (Math.random() - 0.5) * distortion * 10;
            
            ctx.save();
            ctx.globalAlpha = ghostAlpha;
            ctx.fillStyle = ghost.state === 'hunting' ? '#ff0000' : '#8b5cf6';
            
            // Draw ghost shape
            ctx.beginPath();
            ctx.arc(ghostX, ghostY - 50, 30, 0, Math.PI * 2);
            ctx.fill();
            
            // Body
            ctx.beginPath();
            ctx.moveTo(ghostX - 30, ghostY - 50);
            ctx.lineTo(ghostX + 30, ghostY - 50);
            ctx.lineTo(ghostX + 20, ghostY + 50);
            ctx.lineTo(ghostX - 20, ghostY + 50);
            ctx.closePath();
            ctx.fill();
            
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ghostX - 10, ghostY - 60, 5, 0, Math.PI * 2);
            ctx.arc(ghostX + 10, ghostY - 60, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
        
        // Draw player
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Player direction
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(playerRotation) * 20, Math.sin(playerRotation) * 20);
        ctx.stroke();
        
        // Flashlight effect
        const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 150);
        gradient.addColorStop(0, 'rgba(255, 255, 200, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
        
        ctx.save();
        ctx.rotate(playerRotation);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 150, -0.3, 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        ctx.restore();
        
        // Apply sanity-based visual effects
        if (distortion > 0.3) {
            // Vignette
            const vignette = ctx.createRadialGradient(width/2, height/2, 100, width/2, height/2, width/2);
            vignette.addColorStop(0, 'rgba(0,0,0,0)');
            vignette.addColorStop(1, `rgba(139, 92, 246, ${distortion * 0.5})`);
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, width, height);
        }
    }
    
    function handleInvestigationInput(code) {
        const investigation = gameState.investigation;
        
        switch (code) {
            case 'KeyE':
                // Interact / Use equipment
                useCurrentEquipment();
                break;
            case 'KeyF':
                // Toggle flashlight
                toggleFlashlight();
                break;
            case 'KeyQ':
                // Drop item
                dropCurrentItem();
                break;
            case 'Tab':
                // Open journal
                toggleJournal();
                break;
            case 'KeyM':
                // Toggle map
                toggleMap();
                break;
            case 'Escape':
                // Pause / exit
                if (typeof GameUtils !== 'undefined') {
                    GameUtils.pauseGame();
                }
                break;
        }
        
        // Number keys for equipment slots
        if (code.startsWith('Digit')) {
            const slot = parseInt(code.replace('Digit', '')) - 1;
            if (slot >= 0 && slot < 4) {
                selectEquipmentSlot(slot);
            }
        }
    }
    
    function handleInvestigationClick(e) {
        // Check if clicking on a door/connection
        const rect = investigationCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left - investigationCanvas.width / 2;
        const y = e.clientY - rect.top - investigationCanvas.height / 2;
        
        const investigation = gameState.investigation;
        const roomData = investigation.room_layout[investigation.current_room];
        
        roomData.connections.forEach((conn, i) => {
            const angle = (i / roomData.connections.length) * Math.PI * 2;
            const connX = Math.cos(angle) * 250;
            const connY = Math.sin(angle) * 150;
            
            const dist = Math.sqrt(Math.pow(x - connX, 2) + Math.pow(y - connY, 2));
            if (dist < 50) {
                // Move to connected room
                changeRoom(conn);
            }
        });
    }
    
    function changeRoom(newRoom) {
        const investigation = gameState.investigation;
        investigation.current_room = newRoom;
        investigation.visited_rooms.add(newRoom);
        
        // Play sound
        if (typeof HorrorAudio !== 'undefined') {
            HorrorAudio.playFootstep('stone');
        }
        
        // Check for ghost presence
        if (newRoom === investigation.ghost.currentRoom) {
            showNotification('⚠️ Presence Detected', 'You feel a cold chill...', 'warning');
        }
        
        // Check for hazards
        const hazard = investigation.hazards.find(h => h.room === newRoom && !h.discovered);
        if (hazard) {
            hazard.discovered = true;
            showNotification('⚠️ Hazard!', hazard.description, 'danger');
        }
    }
    
    function useCurrentEquipment() {
        // Would use currently selected equipment
        console.log('[Investigation] Using equipment');
    }
    
    function toggleFlashlight() {
        console.log('[Investigation] Toggling flashlight');
    }
    
    function dropCurrentItem() {
        console.log('[Investigation] Dropping item');
    }
    
    function toggleJournal() {
        console.log('[Investigation] Toggling journal');
    }
    
    function toggleMap() {
        console.log('[Investigation] Toggling map');
    }
    
    function selectEquipmentSlot(slot) {
        document.querySelectorAll('.pc-slot').forEach((el, i) => {
            el.classList.toggle('active', i === slot);
        });
    }
    
    function addEvidence(evidence) {
        gameState.investigation.evidence_collected.push(evidence);
        gameState.statistics.evidence_collected++;
        
        // Update evidence panel
        renderEvidencePanel();
        
        // Add to evidence board
        addToEvidenceBoard(evidence);
    }
    
    function renderEvidencePanel() {
        const panel = document.getElementById('collected-evidence');
        if (!panel) return;
        
        const evidence = gameState.investigation.evidence_collected;
        
        if (evidence.length === 0) {
            panel.innerHTML = '<p style="color: #666; font-size: 0.85rem;">No evidence yet...</p>';
            return;
        }
        
        panel.innerHTML = evidence.map(e => `
            <div class="pc-evidence-item new">
                <span>${getEvidenceIcon(e.type)}</span>
                <span>${formatEvidence(e)}</span>
            </div>
        `).join('');
    }
    
    function getEvidenceIcon(type) {
        const icons = {
            ghost_evidence: '👻',
            interaction: '👋',
            photo: '📸',
            audio: '🎙️',
            reading: '📊'
        };
        return icons[type] || '❓';
    }
    
    function formatEvidence(evidence) {
        if (evidence.type === 'ghost_evidence') {
            return evidence.evidence_type.replace(/_/g, ' ').toUpperCase();
        }
        return evidence.subtype || evidence.type;
    }
    
    function checkObjectives() {
        const investigation = gameState.investigation;
        const contract = investigation.contract;
        
        let completed = true;
        
        switch (contract.type) {
            case CONTRACT_TYPES.INVESTIGATION:
                // Need to identify ghost
                if (!investigation.ghost_identified) {
                    completed = false;
                }
                break;
                
            case CONTRACT_TYPES.DOCUMENTATION:
                // Need sufficient evidence
                if (investigation.evidence_collected.length < 3) {
                    completed = false;
                }
                break;
                
            case CONTRACT_TYPES.CONTAINMENT:
                // Ghost must be contained (not implemented in basic version)
                completed = false;
                break;
                
            case CONTRACT_TYPES.EXORCISM:
                // Ghost must be exorcised (not implemented in basic version)
                completed = false;
                break;
                
            case CONTRACT_TYPES.CONSULTATION:
                // Just need to visit and assess
                if (investigation.visited_rooms.size < 3) {
                    completed = false;
                }
                break;
        }
        
        if (completed && investigation.objectives_completed.length === 0) {
            investigation.objectives_completed.push('primary');
            showNotification('✅ Objectives Complete', 'Contract objectives completed! Return to finish.', 'success');
        }
    }
    
    function onInvestigationFailed(reason) {
        gameState.investigation.active = false;
        
        let message = '';
        switch (reason) {
            case 'insanity':
                message = 'You lost your sanity and fled the location.';
                break;
            case 'death':
                message = 'The ghost claimed your soul.';
                break;
            case 'timeout':
                message = 'You ran out of time.';
                break;
        }
        
        showModal('Investigation Failed', message + ' The contract has been marked as failed.');
        
        completeContract(false);
        
        // Return to office
        switchView('office');
    }
    
    function onInvestigationTimeout() {
        onInvestigationFailed('timeout');
    }
    
    function finishInvestigation() {
        const investigation = gameState.investigation;
        
        // Calculate success and bonuses
        let success = investigation.objectives_completed.length > 0;
        let bonus = 0;
        
        // Evidence bonus
        bonus += investigation.evidence_collected.length * 50;
        
        // Photo bonus
        bonus += investigation.photos_taken.length * 25;
        
        // Speed bonus
        const timeBonus = Math.max(0, 300 - investigation.time_elapsed) * 2;
        bonus += timeBonus;
        
        // Sanity bonus
        const sanityBonus = investigation.player_sanity * 5;
        bonus += sanityBonus;
        
        // Ghost identification bonus
        if (investigation.ghost_correctly_identified) {
            bonus += 500;
            gameState.business.discovered_ghosts.add(investigation.ghost.id);
        }
        
        investigation.active = false;
        
        // Stop audio
        if (typeof HorrorAudio !== 'undefined') {
            HorrorAudio.stopAll();
        }
        
        completeContract(success, Math.floor(bonus));
        
        // Return to office
        switchView('office');
    }
    
    function resumeInvestigation() {
        if (gameState.investigation.active) {
            requestAnimationFrame(investigationLoop);
        }
    }
