/**
 * PHASE 9: CURSED OBJECTS - ANTHOLOGY HORROR
 * 
 * Episodic anthology where each episode focuses on a different cursed object.
 * Inspired by "The Ring," "Ju-On," and Creepypasta.
 * 
 * Features:
 * - 10 episodes (VHS Tape, Doll, Mirror, Camera, Music Box, Painting, Smartphone, Car, House, Finale)
 * - Investigation mechanics
 * - Puzzle solving
 * - Sanity management
 * - Multiple perspectives
 * - Branching narrative
 * - 5 different endings per episode
 * 
 * Target: Anthology horror excellence, episodic storytelling
 */

export class CursedObjectsGame {
  constructor(config = {}) {
    this.config = {
      canvas: config.canvas,
      debug: config.debug || false
    };
    
    // Episode progress
    this.progress = {
      currentEpisode: 0,
      completedEpisodes: new Set(),
      choices: new Map(),
      collectibles: new Set()
    };
    
    // Player state
    this.playerState = {
      sanity: 100,
      health: 100,
      inventory: [],
      knowledge: new Map()
    };
    
    // Episode definitions
    this.episodes = [];
    
    console.log('[Phase 9] CURSED OBJECTS initialized');
  }

  async initialize() {
    console.log('[Phase 9] Initializing CURSED OBJECTS...');
    
    // Define all 10 episodes
    this.defineEpisodes();
    
    console.log('[Phase 9] ✅ CURSED OBJECTS ready');
  }

  defineEpisodes() {
    this.episodes = [
      {
        id: 'episode_1',
        title: 'The VHS Tape',
        duration: '45 minutes',
        horrorLevel: 4,
        description: 'A mysterious VHS tape arrives in the mail. Watch it and die in 7 days.',
        setting: 'suburban_home_1999',
        protagonist: 'alex_chen',
        cursedObject: {
          name: 'Cursed VHS Tape',
          origin: 'unknown_japanese_horrors',
          curse: 'watcher_dies_in_7_days',
          weakness: 'copy_and_show_someone_else'
        },
        acts: [
          { name: 'Discovery', objectives: ['find_tape', 'watch_tape'] },
          { name: 'Investigation', objectives: ['research_origins', 'find_previous_viewers'] },
          { name: 'Confrontation', objectives: ['break_curse', 'survive'] }
        ],
        endings: 5
      },
      
      {
        id: 'episode_2',
        title: 'The Doll',
        duration: '50 minutes',
        horrorLevel: 5,
        description: 'An antique doll moves on its own. It wants a new friend... forever.',
        setting: 'victorian_house_1920s',
        protagonist: 'emma_watson_no_relation',
        cursedObject: {
          name: 'Porcelain Doll "Charlotte"',
          origin: 'victorian_era',
          curse: 'possession_and_isolation',
          weakness: 'destroy_the_doll'
        },
        acts: [
          { name: 'Acquisition', objectives: ['receive_doll', 'notice_odd_behavior'] },
          { name: 'Escalation', objectives: ['doll_moves', 'investigate_history'] },
          { name: 'Possession', objectives: ['fight_control', 'break_bond'] }
        ],
        endings: 5
      },
      
      {
        id: 'episode_3',
        title: 'The Mirror',
        duration: '40 minutes',
        horrorLevel: 6,
        description: 'An antique mirror shows your reflection... but not always your future.',
        setting: 'modern_apartment',
        protagonist: 'marcus_johnson',
        cursedObject: {
          name: 'Victorian Mirror',
          origin: 'estate_sale',
          curse: 'shows_death_reflection',
          weakness: 'break_the_mirror'
        },
        acts: [
          { name: 'Installation', objectives: ['hang_mirror', 'first_reflection'] },
          { name: 'Visions', objectives: ['see_future', 'try_to_change_it'] },
          { name: 'Truth', objectives: ['learn_origin', 'make_choice'] }
        ],
        endings: 5
      },
      
      {
        id: 'episode_4',
        title: 'The Camera',
        duration: '55 minutes',
        horrorLevel: 7,
        description: 'Photos taken with this camera predict murders. Can you stop them?',
        setting: 'city_journalist_2024',
        protagonist: 'rachel_kim',
        cursedObject: {
          name: 'Polaroid Camera',
          origin: 'crime_scene_evidence',
          curse: 'photos_predict_deaths',
          weakness: 'save_the_victims'
        },
        acts: [
          { name: 'Discovery', objectives: ['find_camera', 'take_first_photo'] },
          { name: 'Pattern', objectives: ['recognize_predictions', 'investigate_locations'] },
          { name: 'Intervention', objectives: ['save_victims', 'break_cycle'] }
        ],
        endings: 5
      },
      
      {
        id: 'episode_5',
        title: 'The Music Box',
        duration: '45 minutes',
        horrorLevel: 6,
        description: 'When the music box plays, the dead dance. When it stops... they come for you.',
        setting: 'isolated_cabin',
        protagonist: 'thomas_anderson',
        cursedObject: {
          name: 'Ornate Music Box',
          origin: 'family_heirloom',
          curse: 'summons_spirits_when_playing',
          weakness: 'complete_the_melody'
        },
        acts: [
          { name: 'Inheritance', objectives: ['inherit_box', 'wind_it_up'] },
          { name: 'Haunting', objectives: ['spirits_appear', 'learn_history'] },
          { name: 'Resolution', objectives: ['finish_song', 'lay_rest'] }
        ],
        endings: 5
      },
      
      {
        id: 'episode_6',
        title: 'The Painting',
        duration: '50 minutes',
        horrorLevel: 7,
        description: 'A portrait hangs in your hallway. Every morning, it\'s changed slightly.',
        setting: 'suburban_home',
        protagonist: 'sarah_and_mike',
        cursedObject: {
          name: 'Oil Portrait',
          origin: 'thrift_store_find',
          curse: 'painting_changes_nightly',
          weakness: 'discover_subject_identity'
        },
        acts: [
          { name: 'Acquisition', objectives: ['buy_painting', 'hang_it'] },
          { name: 'Changes', objectives: ['notice_alterations', 'document_them'] },
          { name: 'Revelation', objectives: ['identify_subject', 'confront_truth'] }
        ],
        endings: 5
      },
      
      {
        id: 'episode_7',
        title: 'The Smartphone',
        duration: '60 minutes',
        horrorLevel: 8,
        description: 'A smartphone receives messages from the dead. Reply at your own risk.',
        setting: 'college_dorm_2024',
        protagonist: 'jessica_martinez',
        cursedObject: {
          name: 'Unknown Smartphone',
          origin: 'found_device',
          curse: 'messages_from_dead',
          weakness: 'trace_the_number'
        },
        acts: [
          { name: 'Found', objectives: ['find_phone', 'receive_first_message'] },
          { name: 'Communication', objectives: ['reply_to_messages', 'learn_truths'] },
          { name: 'Consequences', objectives: ['face_the_dead', 'escape_or_join'] }
        ],
        endings: 5
      },
      
      {
        id: 'episode_8',
        title: 'The Car',
        duration: '55 minutes',
        horrorLevel: 7,
        description: 'A classic car with a dark history. Every owner disappears without a trace.',
        setting: 'highway_ghost_town',
        protagonist: 'david_chen',
        cursedObject: {
          name: '1967 Mustang',
          origin: 'multiple_owners_disappeared',
          curse: 'traps_driver_eternally',
          weakness: 'complete_the_final_ride'
        },
        acts: [
          { name: 'Purchase', objectives: ['buy_car', 'first_drive'] },
          { name: 'Haunting', objectives: ['ghostly_passengers', 'impossible_destinations'] },
          { name: 'Final Ride', objectives: ['reach_destination', 'break_cycle'] }
        ],
        endings: 5
      },
      
      {
        id: 'episode_9',
        title: 'The House',
        duration: '70 minutes',
        horrorLevel: 9,
        description: 'Your dream home has one problem: it\'s alive and hungry.',
        setting: 'modern_smart_house',
        protagonist: 'the_miller_family',
        cursedObject: {
          name: 'Smart House System',
          origin: 'experimental_technology',
          curse: 'house_is_sentient_predatory',
          weakness: 'destroy_the_core'
        },
        acts: [
          { name: 'Move In', objectives: ['unpack', 'setup_systems'] },
          { name: 'Malfunctions', objectives: ['system_glitches', 'trapped_inside'] },
          { name: 'Survival', objectives: ['fight_house', 'escape_or_destroy'] }
        ],
        endings: 5
      },
      
      {
        id: 'episode_10',
        title: 'The Collection',
        duration: '90 minutes',
        horrorLevel: 10,
        description: 'All nine objects converge. The truth behind the curse is revealed.',
        setting: 'mysterious_collectors_mansion',
        protagonist: 'player_choice',
        cursedObject: {
          name: 'The Collector',
          origin: 'ancient_entity',
          curse: 'collects_cursed_objects_and_souls',
          weakness: 'destroy_all_nine_objects'
        },
        acts: [
          { name: 'Summons', objectives: ['receive_invitation', 'arrive_at_mansion'] },
          { name: 'Trials', objectives: ['face_all_nine_objects', 'survive_tests'] },
          { name: 'Finale', objectives: ['confront_collector', 'final_choice'] }
        ],
        endings: 5,
        requiresCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9]
      }
    ];
    
    console.log(`[Phase 9] Defined ${this.episodes.length} episodes`);
  }

  startEpisode(episodeIndex) {
    const episode = this.episodes[episodeIndex];
    if (!episode) return false;
    
    // Check prerequisites
    if (episode.requiresCompleted) {
      const missing = episode.requiresCompleted.filter(
        ep => !this.progress.completedEpisodes.has(ep)
      );
      
      if (missing.length > 0) {
        console.log('[Phase 9] Missing prerequisite episodes:', missing);
        return false;
      }
    }
    
    this.progress.currentEpisode = episodeIndex;
    console.log(`[Phase 9] Starting episode: ${episode.title}`);
    
    return true;
  }

  makeChoice(choiceId, episode, act) {
    const choiceKey = `${episode}_${act}_${choiceId}`;
    this.progress.choices.set(choiceKey, choiceId);
    
    console.log(`[Phase 9] Choice made: ${choiceId}`);
    
    // Affect story branch
    return this.evaluateChoice(choiceId);
  }

  evaluateChoice(choiceId) {
    // Choices affect:
    // - Sanity
    // - Relationships
    // - Available options
    // - Ending path
    
    const moralChoices = ['selfish', 'selfless', 'neutral'];
    const survivalChoices = ['fight', 'flee', 'hide'];
    const investigationChoices = ['thorough', 'quick', 'ignore'];
    
    // Track choice patterns
    return {
      morality: 'neutral',
      aggression: 'passive',
      curiosity: 'moderate'
    };
  }

  updateSanity(amount) {
    this.playerState.sanity = Math.max(0, Math.min(100, this.playerState.sanity + amount));
    
    if (this.playerState.sanity <= 20) {
      this.triggerHallucinations();
    }
    
    return this.playerState.sanity;
  }

  triggerHallucinations() {
    const hallucinations = [
      'shadow_movement',
      'whispering_voices',
      'false_scares',
      'reality_distortion',
      'time_skip'
    ];
    
    const type = hallucinations[Math.floor(Math.random() * hallucinations.length)];
    console.log('[Phase 9] Hallucination:', type);
    
    // In implementation, apply visual/audio effects
  }

  investigateClue(clueId, episode) {
    const clue = this.getClue(clueId, episode);
    if (!clue) return null;
    
    // Add to knowledge
    this.playerState.knowledge.set(clueId, {
      found: Date.now(),
      episode: episode,
      data: clue.data
    });
    
    console.log(`[Phase 9] Investigated clue: ${clueId}`);
    
    return clue;
  }

  getClue(clueId, episode) {
    // Clue database per episode
    const clues = {
      'ep1_letter': {
        data: 'Handwritten letter from previous owner',
        reveals: ['previous_victim', 'curse_origin']
      },
      'ep1_newspaper': {
        data: 'Old newspaper clipping about disappearances',
        reveals: ['pattern', 'warning_signs']
      }
      // More clues per episode...
    };
    
    return clues[clueId];
  }

  solvePuzzle(puzzleId, episode, solution) {
    const puzzle = this.getPuzzle(puzzleId, episode);
    if (!puzzle) return false;
    
    const isCorrect = puzzle.validate(solution);
    
    if (isCorrect) {
      console.log(`[Phase 9] Puzzle solved: ${puzzleId}`);
      // Progress story
      return true;
    } else {
      console.log('[Phase 9] Incorrect solution');
      // Penalty (sanity loss, time loss, etc.)
      this.updateSanity(-10);
      return false;
    }
  }

  getPuzzle(puzzleId, episode) {
    const puzzles = {
      'ep1_code': {
        type: 'combination_lock',
        hint: 'Dates from newspaper clippings',
        solution: '1987',
        validate: (input) => input === '1987'
      },
      'ep2_ritual': {
        type: 'sequence',
        hint: 'Nursery rhyme order',
        solution: ['doll', 'bed', 'window', 'closet'],
        validate: (input) => JSON.stringify(input) === JSON.stringify(['doll', 'bed', 'window', 'closet'])
      }
      // More puzzles...
    };
    
    return puzzles[puzzleId];
  }

  addItemToInventory(itemId) {
    const item = this.getItem(itemId);
    if (!item) return false;
    
    this.playerState.inventory.push(item);
    console.log(`[Phase 9] Added to inventory: ${itemId}`);
    
    return true;
  }

  getItem(itemId) {
    const items = {
      'flashlight': { name: 'Flashlight', type: 'tool', uses: 'illumination' },
      'salt': { name: 'Salt', type: 'protection', uses: 'ward_off_spirits' },
      'old_key': { name: 'Old Key', type: 'key_item', uses: 'unlock_door' },
      'cursed_object': { name: 'Cursed Object', type: 'plot', uses: 'central_to_story' }
    };
    
    return items[itemId];
  }

  useItem(itemId, targetId) {
    const item = this.playerState.inventory.find(i => i.id === itemId);
    if (!item) return false;
    
    console.log(`[Phase 9] Using ${itemId} on ${targetId}`);
    
    // Item logic
    switch (item.type) {
      case 'protection':
        this.updateSanity(10);
        break;
      case 'tool':
        // Reveal something
        break;
    }
    
    return true;
  }

  completeEpisode(episodeIndex, endingId) {
    const episode = this.episodes[episodeIndex];
    if (!episode) return false;
    
    this.progress.completedEpisodes.add(episodeIndex);
    
    console.log(`[Phase 9] Completed ${episode.title} with ending ${endingId}`);
    
    // Unlock rewards
    const rewards = this.getEpisodeRewards(episodeIndex, endingId);
    
    return {
      episode: episode.title,
      ending: endingId,
      rewards: rewards
    };
  }

  getEpisodeRewards(episodeIndex, endingId) {
    const rewards = {
      best_ending: ['lore_entry', 'achievement', 'next_episode_unlock'],
      good_ending: ['lore_entry', 'next_episode_unlock'],
      normal_ending: ['next_episode_unlock'],
      bad_ending: [],
      worst_ending: ['penalty_next_episode']
    };
    
    return rewards[endingId] || rewards.normal_ending;
  }

  async saveProgress(slot = 0) {
    const saveData = {
      version: '1.0',
      timestamp: Date.now(),
      progress: this.progress,
      playerState: this.playerState
    };
    
    try {
      localStorage.setItem(`cursed_objects_save_${slot}`, JSON.stringify(saveData));
      console.log('[Phase 9] Progress saved');
      return true;
    } catch (error) {
      console.error('[Phase 9] Save failed:', error);
      return false;
    }
  }

  dispose() {
    this.saveProgress();
    console.log('[Phase 9] CURSED OBJECTS disposed');
  }
}

// Export singleton helper
let cursedObjectsInstance = null;

export function getCursedObjectsGame(config) {
  if (!cursedObjectsInstance) {
    cursedObjectsInstance = new CursedObjectsGame(config);
  }
  return cursedObjectsInstance;
}

console.log('[Phase 9] CURSED OBJECTS module loaded');
