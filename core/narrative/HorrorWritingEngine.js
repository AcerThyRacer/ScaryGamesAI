/**
 * ScaryGamesAI - Horror Writing Engine
 * Phase 1: Foundational Horror Writing System
 *
 * Transformational narrative generation engine that creates rich,
 * thematically consistent horror content dynamically across all games.
 *
 * Features:
 * - Genre-specific writing with 12 horror subgenres
 * - Sanity-based narrative adaptation (11 sanity levels)
 * - Dynamic template filling with advanced vocabulary
 * - Legacy content enhancement
 * - Cross-game narrative consistency
 */
import { LoreSystem } from '../../api/lore-system.js';

class HorrorWritingEngine {
  constructor(options = {}) {
    this.options = {
      lexiconPath: options.lexiconPath || '/data/lore/horror_lexicon.json',
      playerStateEnabled: options.playerStateEnabled !== false,
      crossGameEnabled: options.crossGameEnabled !== false,
      ...options
    };

    // Core systems
    this.lexicon = null;
    this.templates = {};
    this.playerStates = {};
    this.loreSystem = null;
    this.initialized = false;

    // Legacy content cache
    this.legacyContentCache = new Map();

    // Currently active game & theme
    this.currentGameId = null;
    this.currentTheme = 'psychological_horror';
    this.currentSanityLevel = 'normal';
  }

  /**
   * Initialize the horror writing engine
   * Loads lexicon and sets up connections to other systems
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load horror lexicon
      await this.loadLexicon();

      // Initialize templates and patterns
      this.setupTemplates();

      // Connect to lore system if available
      if (this.options.crossGameEnabled) {
        this.connectToLoreSystem();
      }

      this.initialized = true;
      console.log(`HorrorWritingEngine initialized with ${this.getTermCount()} terms`);
    } catch (error) {
      console.error('HorrorWritingEngine initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load the horror lexicon from JSON file
   */
  async loadLexicon() {
    try {
      const response = await fetch(this.options.lexiconPath);
      if (!response.ok) {
        throw new Error(`Failed to load lexicon: ${response.status} ${response.statusText}`);
      }
      this.lexicon = await response.json();

      // Validate lexicon structure
      this.validateLexicon();
    } catch (error) {
      console.error('Using fallback lexicon due to error:', error);
      // Create minimal fallback lexicon
      this.lexicon = this.createFallbackLexicon();
    }
  }

  /**
   * Validate the loaded lexicon
   */
  validateLexicon() {
    if (!this.lexicon || typeof this.lexicon !== 'object') {
      throw new Error('Lexicon is not a valid object');
    }

    if (!this.lexicon.metadata || !this.lexicon.metadata.horror_subgenres) {
      throw new Error('Lexicon missing required metadata');
    }

    // Check for required sections
    const requiredSections = [
      'vocabulary', 'phraseology', 'themes',
      'atmosphere_templates', 'content_constraints'
    ];

    const missingSections = requiredSections.filter(
      section => !this.lexicon[section]
    );

    if (missingSections.length > 0) {
      console.warn(`Lexicon missing sections: ${missingSections.join(', ')}`);
    }
  }

  /**
   * Create a minimal fallback lexicon if loading fails
   */
  createFallbackLexicon() {
    return {
      version: "fallback-1.0.0",
      description: "Minimal fallback horror lexicon",
      metadata: {
        horror_subgenres: ['psychological_horror', 'gothic_horror'],
        sanity_levels: ['normal', 'disturbed', 'paranoid']
      },
      vocabulary: {
        nouns_by_theme: {
          existential: ['void', 'darkness'],
          cosmic: ['eldritch horror', 'ancient being']
        },
        verbs_by_terror: {
          breathless: ['gasp', 'choke']
        }
      },
      themes: {
        horror_types: {
          psychological_horror: {
            name: "Psychological Horror",
            writing_rules: {
              sentence_structure: {
                complexity_normal: 0.5,
                fragment_probability: 0.3
              }
            }
          }
        }
      },
      atmosphere_templates: {
        location_descriptions: {
          default: ["The {location_feature} appears hauntingly {adjective}."]
        }
      }
    };
  }

  /**
   * Set up templates and patterns from lexicon
   */
  setupTemplates() {
    // Extract templates from lexicon
    try {
      this.templates = {
        location: this.extractTemplates('atmosphere_templates.location_descriptions'),
        narrative: this.extractTemplates('phraseology.inward_addressing.templates'),
        dynamic: this.extractTemplates('atmosphere_templates.dynamic_variation'),
        interactive: this.extractTemplates('atmosphere_templates.interactive')
      };

      // Initialize template processor with lexicon
      this.templateProcessor = new TemplateProcessor(this.lexicon);
    } catch (error) {
      console.error('Template setup failed:', error);
    }
  }

  /**
   * Extract templates from lexicon path
   */
  extractTemplates(path) {
    const parts = path.split('.');
    let current = this.lexicon;

    try {
      for (const part of parts) {
        if (current[part] === undefined) return [];
        current = current[part];
      }
      return current;
    } catch (error) {
      return [];
    }
  }

  /**
   * Connect to the cross-game lore system
   */
  connectToLoreSystem() {
    try {
      this.loreSystem = LoreSystem.getInstance();
      if (this.loreSystem) {
        console.log('HorrorWritingEngine connected to LoreSystem');
        // Listen for discoveries that might affect narrative
        this.loreSystem.on('onDiscovery', (discovery) => {
          this.handleLoreDiscovery(discovery);
        });
      }
    } catch (error) {
      console.error('Failed to connect to LoreSystem:', error);
    }
  }

  /**
   * Handle lore discoveries that may affect narrative generation
   */
  handleLoreDiscovery(discovery) {
    // Check if this discovery affects narrative tone, themes, or constraints
    if (discovery.type === 'secret' || discovery.type === 'revelation') {
      this.cachePlayerState(discovery.gameId, {
        lastDiscovery: discovery,
        narrativeConstraints: discovery.data.constraints
      });
    }

    // Check if this connects to other games
    if (discovery.data.crossGameConnections) {
      this.cachePlayerState(discovery.gameId, {
        crossGameImpact: discovery.data.crossGameConnections
      });
    }
  }

  /**
   * Set the current game context for narrative generation
   */
  setGameContext(gameId, options = {}) {
    this.currentGameId = gameId;
    this.currentTheme = options.theme ||
      this.lexicon.metadata.horror_subgenres.includes(options.theme) ?
      options.theme : 'psychological_horror';
    this.currentSanityLevel = options.sanity ||
      this.lexicon.metadata.sanity_levels.includes(options.sanity) ?
      options.sanity : 'normal';

    console.log(`HorrorWritingEngine: context set to ${gameId}, theme: ${this.currentTheme}, sanity: ${this.currentSanityLevel}`);
  }

  /**
   * Set the current horror theme/subgenre
   */
  setTheme(theme) {
    if (this.lexicon.metadata.horror_subgenres.includes(theme)) {
      this.currentTheme = theme;
      return true;
    }
    console.warn(`Theme ${theme} not found, using ${this.currentTheme}`);
    return false;
  }

  /**
   * Set the sanity level for narrative adaptation
   */
  setSanityLevel(level) {
    if (this.lexicon.metadata.sanity_levels.includes(level)) {
      this.currentSanityLevel = level;
      return true;
    }
    console.warn(`Sanity level ${level} not found, using ${this.currentSanityLevel}`);
    return false;
  }

  /**
   * Generate a narratively rich location description
   */
  generateLocationDescription(locationType, options = {}) {
    try {
      const templateSet = locationType.includes('hospital')
        ? 'abandoned_hospital_psychological'
        : locationType.includes('corridor')
          ? 'endless_corridor_horror'
          : locationType.replace(/ /g, '_');

      const templates = this.templates.location[templateSet] || this.templates.location.default;

      return this.templateProcessor.renderDynamic(
        this.getRandomTemplate(templates),
        this.getGenerationContext({ ...options, locationType })
      );
    } catch (error) {
      console.error('Location description generation failed:', error);
      return this.getFallbackText('location');
    }
  }

  /**
   * Generate narrative text appropriate to the current context
   */
  generateNarrative(referentType, options = {}) {
    let templates = [];

    // Select templates based on referent type
    switch (referentType) {
      case 'diary_entry':
      case 'note':
      case 'letter':
        templates = this.lexicon.phraseology.fragmentary_damage.templates;
        break;
      case 'audio_log':
        templates = this.lexicon.atmosphere_templates.entity_behavior.auditory_non_visual_entities.patterns;
        break;
      case 'internal_monologue':
      default:
        templates = this.lexicon.phraseology.inward_addressing.templates ||
                    this.templates.narrative;
    }

    try {
      return this.templateProcessor.renderDynamic(
        this.getRandomTemplate(templates),
        this.getGenerationContext(options)
      );
    } catch (error) {
      console.error(`Narrative generation failed for ${referentType}:`, error);
      return this.getFallbackText(referentType);
    }
  }

  /**
   * Enhance existing content with horror-rich details
   * Used for legacy content enhancement
   */
  enhanceContent(originalContent, contentType = 'note', options = {}) {
    // Check cache for already enhanced content
    const cacheKey = `${contentType}:${originalContent.substring(0, 50)}`;
    if (this.legacyContentCache.has(cacheKey)) {
      return this.legacyContentCache.get(cacheKey);
    }

    try {
      // Index original content in compatibility mappings
      const enhanced = this.applyLegacyEnhancement(originalContent, contentType, options);

      // Cache result
      this.legacyContentCache.set(cacheKey, enhanced);
      return enhanced;
    } catch (error) {
      console.error(`Content enhancement failed for ${contentType}:`, error);
      return `[ENHANCEMENT ERROR: ${originalContent}]`;
    }
  }

  /**
   * Apply legacy content enhancement based on content type
   */
  applyLegacyEnhancement(originalContent, contentType, options) {
    // Check direct mappings in compatibility section
    if (this.lexicon.legacy_compatibility &&
        this.lexicon.legacy_compatibility.old_to_new_key_mappings) {

      for (const [key, mapping] of Object.entries(
        this.lexicon.legacy_compatibility.old_to_new_key_mappings)) {

        if (originalContent.includes(key)) {
          // Use theme-specific enhancement
          const enhancedVersion = mapping.enhanced_versions[this.currentTheme] ||
                                mapping.enhanced_versions.psychological_horror;

          if (enhancedVersion) {
            const result = this.templateProcessor.renderDynamic(
              enhancedVersion,
              this.getGenerationContext(options)
            );

            // Add physical degradation for realism
            return this.addContentConstraints(result, contentType);
          }
        }
      }
    }

    // Default sophisticated enhancement algorithm
    return this.defaultContentEnhancer(originalContent, contentType, options);
  }

  /**
   * Default enhancer for legacy content
   */
  defaultContentEnhancer(originalContent, contentType, options) {
    let enhanced = `[${this.getArtifactDescriptor(contentType)}]\n\n`;

    // Split into sentences and enhance each
    const sentences = originalContent.split(/(?<=[.!?])\s+/);
    const processedSentences = sentences.map(sentence => {
      // Remove simplistic phrasing
      sentence = sentence.replace(/\b(I|we) found (myself|ourselves) here\b/gi, '{{character_disorientation}}');

      // Add thematic richness
      return this.templateProcessor.fillSimpleTemplate(
        `{original_sentence} [+{thematic_expansion}]`,
        {
          original_sentence: sentence,
          thematic_expansion: this.getThematicExpansion(this.currentTheme)
        }
      );
    });

    enhanced += this.adjustSentenceStructure(
      processedSentences.join(' '),
      this.getComplexityRules()
    );

    return this.addContentConstraints(enhanced, contentType);
  }

  /**
   * Get thematic expansion for current horror theme
   */
  getThematicExpansion(theme) {
    if (!this.lexicon.themes.horror_types[theme]) return '';

    const themeConfig = this.lexicon.themes.horror_types[theme];

    // Use vocabulary subsets defined in theme
    if (themeConfig.vocabulary_subsets) {
      const expansions = themeConfig.vocabulary_subsets.map(subset => {
        const [section, key] = subset.split('.');
        return this.getRandomListItem(this.lexicon.vocabulary[section][key]);
      });

      return expansions.join(', ').replace(/, ([^,]*)$/, ' and $1');
    }

    return this.getRandomListItem(this.lexicon.vocabulary.nouns_by_theme[theme] || []);
  }

  /**
   * Add physical content constraints based on content type
   * (makes content feel "physical" and grounded in reality)
   */
  addContentConstraints(text, contentType) {
    // Get appropriate constraint types
    const constraints = this.lexicon.content_constraints.realism[contentType] ||
        this.lexicon.content_constraints.realism.default || [];

    // Add physical degradation
    if (contentType === 'note') {
      const artifacts = Array.isArray(constraints)
        ? constraints : this.lexicon.content_constraints.realism.note_artifacts;
      text = this.addArtifactDescriptions(text, artifacts);
    }

    // Add temporal disruptions for certain content
    if (text.length > 200 && Math.random() > 0.7) {
      const temporalTemplate = this.getRandomTemplate(
        this.lexicon.content_constraints.temporal_narrative.multiple_times_collapsing.templates
      );
      text = `${text}\n\n[--- FRAGMENT TIMELINE OVERRIDE: ${this.templateProcessor.renderDynamic(temporalTemplate, {})} ---]`;
    }

    return text;
  }

  /**
   * Add artifact descriptions to make content feel physical
   */
  addArtifactDescriptions(text, artifacts) {
    let enhanced = text;

    // Add header with artifact description
    const artifact = this.getRandomListItem(artifacts);
    enhanced = `[${artifact.toUpperCase()} NOTE]\n\n${enhanced}`;

    // Add random damage
    const damageTypes = [
      `The ${artifact} makes the text {damage_effect} in some areas`,
      `{concept} interferes with the readability past this point`,
      `A {substance} stain obscures the bottom {percentage}`
    ];

    const damageEffect = this.templateProcessor.renderDynamic(
      this.getRandomTemplate(damageTypes),
      {
        damage_effect: this.getRandomListItem(['smeared', 'faded', 'difficult to make out']),
        concept: this.getRandomListItem(this.lexicon.vocabulary.nouns_by_theme.existential),
        substance: this.getRandomListItem(['blood', 'oil', 'something viscous']),
        percentage: `${Math.floor(Math.random() * 40) + 10}%`
      }
    );

    enhanced += `\n\n[PHYSICAL DAMAGE: ${damageEffect}]`;

    return enhanced;
  }

  /**
   * Get physical descriptor for content artifact
   */
  getArtifactDescriptor(contentType) {
    const descriptors = {
      'note': [
        'FRAGMENT FOUND ON PERSON',
        'TATTERED JOURNAL PAGE',
        'RECOVERED MEDICAL NOTES',
        'WATER-DAMAGED SCRAP'
      ],
      'audio_log': [
        'MAGNETIC TAPE (DEGRADATION 35%)',
        'MINI-DISC (CORRUPTION)',
        'DICTAPHONE RECORDING',
        'POLICE INTERVIEW CASSETTE'
      ],
      'letter': [
        'YELLOWED LETTER (SEALED WITH WAX)',
        'TATTERED LOVE LETTER',
        'FINAL LETTER FROM DESERTED'
      ],
      'document': [
        'CLASSIFIED MILITARY DOCUMENT',
        'CASE FILE: {{CASE_NUMBER}}',
        'RESIDENT EVACUATION ORDER'
      ]
    };

    return this.templateProcessor.renderDynamic(
      this.getRandomListItem(descriptors[contentType] || descriptors.note),
      { case_number: this.generateCaseNumber() }
    );
  }

  /**
   * Generate a realistic case file number
   */
  generateCaseNumber() {
    const prefixes = ['SCRY', 'FOIA', 'REST', 'ARC', 'HUSH'];
    const years = ['198', '199', '200', '201'];
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    return `${this.getRandomListItem(prefixes)}-${this.getRandomListItem(years)}` +
           `-${letters[Math.floor(Math.random() * 26)]}${Math.floor(Math.random() * 1000)}` +
           `-${letters[Math.floor(Math.random() * 26)]}`;
  }

  /**
   * Adjust sentence structure based on theme rules and sanity level
   */
  adjustSentenceStructure(text, rules) {
    // Split into sentences
    const sentences = text.split(/(?<=[.!?])\s+/);

    // Process each sentence based on rules
    const processed = sentences.map(sentence => {
      let result = sentence;

      // Adjust complexity based on sanity level
      const complexityFactor =
        this.getThemeRule('sentence_structure', `complexity_${this.currentSanityLevel}`) ||
        rules.complexity || 0.5;

      if (complexityFactor > 0.7 && sentence.length < 40) {
        // Add dependent clause
        result = `${result} ${this.generateDependentClause(complexityFactor)}`;
      }

      // Fragments
      if (this.shouldApplyTechnique('fragment_probability', rules)) {
        if (result.length < 60 && Math.random() > 0.7) {
          // Convert to fragment
          result = this.convertToFragment(result);
        }
      }

      // Ellipsis
      if (this.shouldApplyTechnique('ellipsis_probability', rules)) {
        if (result.length > 50) {
          result = this.addEllipsis(result);
        }
      }

      return result;
    });

    return processed.join(' ');
  }

  /**
   * Should technique be applied based on probability
   */
  shouldApplyTechnique(techniqueName, rules) {
    const baseProbability = rules[techniqueName] || 0.1;
    const sanityFactor = this.getSanityAdjustmentFactor(techniqueName);
    return Math.random() < (baseProbability * sanityFactor);
  }

  /**
   * Get adjustment factor based on sanity level
   */
  getSanityAdjustmentFactor(techniqueName) {
    if (techniqueName.includes('fragment') || techniqueName.includes('ellipsis')) {
      // Lower sanity increases fragmentation
      const sanityIndex = this.lexicon.metadata.sanity_levels.indexOf(this.currentSanityLevel);
      return 1 + (sanityIndex * 0.15); // 1.0 to 2.5
    }
    return 1;
  }

  /**
   * Generate a dependent clause to increase sentence complexity
   */
  generateDependentClause(complexity) {
    const clauses = [
      `though ${this.getRandomListItem(['nobody', 'nothing', 'no sound'])} answered the ${this.getRandomListItem(['scream', 'prayer', 'echo'])}`,
      `as though the ${this.getRandomListItem(['wall', 'floor', 'ceiling'])} had begun to ${this.getRandomListItem(this.lexicon.vocabulary.verbs_by_terror.confined)}`,
      `despite my ${this.getRandomListItem(['vehement refusal', 'deep denial', 'earnest protestation'])} that it couldn't exist`,
      `though I had no ${this.getRandomListItem(['memory', 'recollection', 'evidence'])} of ever witnessing it directly`
    ];

    // Higher complexity gets longer clauses
    if (complexity > 0.8) {
      return `, ${this.getRandomListItem(clauses)} — ${this.getRandomListItem(clauses).replace(/^though|as though/, '')}`;
    }

    return `, ${this.getRandomListItem(clauses)}`;
  }

  /**
   * Convert a complete sentence to a fragment
   */
  convertToFragment(sentence) {
    // Remove subject
    const noSubject = sentence.replace(/^([A-Z][a-z]+ )?/, '');

    // Remove verb
    const noVerb = noSubject.replace(/([a-z]+ ){1,3}/, '');

    // Add ellipsis
    return noVerb.charAt(0).toUpperCase() + noVerb.slice(1) + '...';
  }

  /**
   * Add ellipsis to create suspense
   */
  addEllipsis(sentence) {
    // Find natural breaks
    const breakPoints = [' after', ' when', ' as', ' but', ' though'];
    const breakIndex = breakPoints.reduce((minIndex, phrase) => {
      const index = sentence.lastIndexOf(phrase);
      return index > minIndex ? index : minIndex;
    }, -1);

    if (breakIndex > 0) {
      return sentence.substring(0, breakIndex).trim() + '...';
    }

    // Fallback: just ellipsis at end
    return sentence.substring(0, sentence.length * 0.8).trim() + '...';
  }

  /**
   * Get theme-specific rules
   */
  getThemeRule(section, ruleName) {
    if (!this.lexicon.themes.horror_types[this.currentTheme]) return null;

    const themeConfig = this.lexicon.themes.horror_types[this.currentTheme];
    const rulePath = section.split('.');

    let current = themeConfig;
    for (const part of rulePath) {
      if (current[part] === undefined) return null;
      current = current[part];
    }

    return current[ruleName];
  }

  /**
   * Get writing rules based on current theme and sanity
   */
  getComplexityRules() {
    const themeRules = this.lexicon.themes.horror_types[this.currentTheme] &&
        this.lexicon.themes.horror_types[this.currentTheme].writing_rules || {};

    const sanityKey = `complexity_${this.currentSanityLevel}`;

    return {
      complexity: this.getThemeRule('sentence_structure', sanityKey) ||
                  themeRules.sentence_structure?.complexity_normal ||
                  0.5,
      fragment_probability: themeRules.sentence_structure?.fragment_probability || 0.3,
      ellipsis_probability: themeRules.sentence_structure?.ellipsis_probability || 0.2,
      ...themeRules.sentence_structure || {}
    };
  }

  /**
   * Get generation context including theme, sanity, and game-specific data
   */
  getGenerationContext(options = {}) {
    const playerState = this.getPlayerState(this.currentGameId) || {};
    const gameLore = this.loreSystem ? this.loreSystem.getGameLore(this.currentGameId) : {};
    const sceneTime = this.getSceneTimeDescriptor();

    return {
      theme: this.currentTheme,
      sanity: this.currentSanityLevel,
      ...this.getThemeVocabulary(),
      ...gameLore,
      ...playerState,
      ...options,
      player_name: playerState.playerName || 'survivor',
      current_time: sceneTime,
      trigger_words: this.getTriggerWords(),
      concept_challenges: this.getConceptChallenges()
    };
  }

  /**
   * Get scene time of day description
   */
  getSceneTimeDescriptor() {
    const times = [
      { hour: 0, description: 'just after the dead stroke of midnight, when clocks routinely fail and reality blinks' },
      { hour: 3, description: 'in the vicious 3:33 a.m. interstice—those twenty-seven depthless minutes when awareness frays' },
      { hour: 6, description: 'at dawn\'s false promise when the shadows, relieved of duty, seem relieved' },
      { hour: 12, description: 'during the violet noon collapse, when sunlight thins to reveal the underlying absence' },
      { hour: 18, description: 'as the drowning nightfall submerges once-familiar angles into seductive shape' }
    ];

    const h = new Date().getHours();
    const current = times.find(time => h >= time.hour);
    return current ? current.description :
           'at a time characterized by the missing hands on nearby analog clocks';
  }

  /**
   * Get trigger words based on currently active triggers
   */
  getTriggerWords() {
    const triggers = [];
    const baseTriggers = this.lexicon.base_rules.triggers;

    // Check which triggers are active based on current context
    if (this.currentTheme.includes('abandonment') ||
        this.currentSanityLevel === 'disturbed' ||
        this.getTriggerActivation('abandonment')) {
      triggers.push(...baseTriggers.abandonment.words);
    }

    if (this.getTriggerActivation('isolation')) {
      triggers.push(...baseTriggers.isolation.words);
    }

    // Add other trigger checks...

    // Remove duplicates
    return [...new Set(triggers)].join(', ');
  }

  /**
   * Check if trigger should be activated based on context
   */
  getTriggerActivation(triggerName) {
    if (!this.playerStates[this.currentGameId]) return false;

    const state = this.playerStates[this.currentGameId];

    // Check player state
    if (state.trigger_activations && state.trigger_activations[triggerName]) {
      return true;
    }

    // Check game lore
    if (state.crossGameImpact && state.crossGameImpact.includes(triggerName)) {
      return true;
    }

    // Random activation for some triggers
    if (triggerName === 'abandonment' && this.currentSanityLevel.includes('disturbed')) {
      return Math.random() > 0.7;
    }

    return false;
  }

  /**
   * Get vocabulary for current theme
   */
  getThemeVocabulary() {
    if (!this.lexicon.themes.horror_types[this.currentTheme]) {
      return {};
    }

    const themeConfig = this.lexicon.themes.horror_types[this.currentTheme];

    // Build vocabulary object
    const vocab = {};

    if (themeConfig.vocabulary_subsets) {
      themeConfig.vocabulary_subsets.forEach(subset => {
        const [section, key] = subset.split('.');
        if (this.lexicon.vocabulary[section] && this.lexicon.vocabulary[section][key]) {
          vocab[`${section}_${key}`] = this.lexicon.vocabulary[section][key];
        }
      });
    }

    // Add theme-specific words
    Object.entries(this.lexicon.vocabulary).forEach(([section, keys]) => {
      if (keys[this.currentTheme]) {
        vocab[section] = keys[this.currentTheme];
      }
    });

    return vocab;
  }

  /**
   * Get concept challenges to inject into prose
   * (cognitive dissonance, paradoxes, etc.)
  */
  getConceptChallenges() {
    const challenges = [];
    const baseChallenges = [
      'concept: a hook without a bait—a thing that should exist solely to lead to further explication finds itself existentially marooned',
      'observation: something not merely invisible but EVASIVE—it flees the very possibility of observation by not merely disappearing but making DETECTION ITSELF seem like naive imaginings',
      'ontological dilemma: {descriptor} no longer appears to obey the {constraint_set} governing objects of its apparent class'
    ];

    // Add sanity-specific challenges
    if (this.currentSanityLevel.includes('paranoid')) {
      challenges.push('notational inconsistency: the same {object} appears in multiple {records}, each instance contradicting others in {detail}');
    }

    // Add theme-specific challenges
    const themeChallenges =
      this.lexicon.content_constraints[this.currentTheme + '_challenges'] || [];
    challenges.push(...themeChallenges.map(challenge =>
      this.templateProcessor.renderDynamic(challenge, {})
    ));

    // Add base challenges
    baseChallenges.forEach(template => {
      if (Math.random() > 0.7) {  // 30% chance to include
        challenges.push(
          this.templateProcessor.renderDynamic(template, {
            descriptor: this.getConceptDescriptor(),
            constraint_set: this.getRandomListItem(['laws of physics', 'rules governing three-dimensional space', 'expectations of solid objects']),
            record: this.getRandomListItem(['inventory sheets', 'evacuation rosters', 'psychiatric reports']),
            object: this.getRandomNoun(),
            detail: this.getRandomListItem(['material composition', 'location', 'condition'])
          })
        );
      }
    });

    return challenges.join('|');
  }

  /**
   * Get a concept descriptor (abstract property)
   */
  getConceptDescriptor() {
    return this.getRandomListItem([
      'its edge coherence', 'the expectation-reward correlation',
      'transitive semantics', 'indexical properties', 'memory echo fidelity'
    ]);
  }

  /**
   * Get a random noun
   */
  getRandomNoun() {
    const themes = ['existential', 'cosmic', 'gothic', 'folk'];
    const theme = this.getRandomListItem(themes);
    return this.getRandomListItem(this.lexicon.vocabulary.nouns_by_theme[theme] || []);
  }

  /**
   * Cache player state for game context
   */
  cachePlayerState(gameId, stateUpdate) {
    if (!this.options.playerStateEnabled) return;

    if (!this.playerStates[gameId]) {
      this.playerStates[gameId] = {};
    }

    this.playerStates[gameId] = {
      ...this.playerStates[gameId],
      ...stateUpdate
    };

    // Persist to storage if available
    this.persistPlayerStates();
  }

  /**
   * Get cached player state
   */
  getPlayerState(gameId) {
    return this.playerStates[gameId] || {};
  }

  /**
   * Persist player states (if supported)
   */
  persistPlayerStates() {
    // In a real implementation, this would persist to a storage system
    // For now, just a placeholder indicating the capability exists
    console.debug('Player states cached for narrative generation');
  }

  /**
   * Get random template from available templates
   */
  getRandomTemplate(templates) {
    if (!templates || templates.length === 0) {
      return "{default_template}";
    }
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Get random list item
   */
  getRandomListItem(list) {
    if (!list || !Array.isArray(list) || list.length === 0) {
      return '';
    }
    return list[Math.floor(Math.random() * list.length)];
  }

  /**
   * Get total term count in lexicon
   */
  getTermCount() {
    let count = 0;

    // Count vocabulary
    if (this.lexicon.vocabulary) {
      Object.values(this.lexicon.vocabulary).forEach(section => {
        if (Array.isArray(section)) {
          count += section.length;
        } else if (typeof section === 'object') {
          Object.values(section).forEach(list => {
            if (Array.isArray(list)) count += list.length;
          });
        }
      });
    }

    // Count templates (approximate)
    count += Object.values(this.templates).reduce(
      (total, templates) => total + templates.length, 0);

    return count;
  }

  /**
   * Get fallback text with appropriate style
   */
  getFallbackText(type) {
    const fallbacks = {
      location: "The air hangs thick with disuse, bearing the faint metallic suggestion of {recent_activity}. The {condition} surfaces attract a film of {ambiance} that never quite obscures the eyes embedded in the material.",
      note: "[ DAMAGED MEDIA FRAGMENT ]\n\n...{subject}... was documented in {location} by {author_description} on {date}. Subsequent investigation determined {outcome}. Further data unavailable.\n\n[ PHYSICAL FORENSIC MARK: {artifact_description} ]",
      audio_log: "[ AUDIO DISTORTION AMPLITUDE: 0.45 ]\nfragment [VOCAL]: ...please close the {target} before the {threat} {verb} through... [SKIPPING 0.8s]\nresidual: {substance} sounds like water but moves like {comparison}",
      internal_monologue: "{self_description}: {impulse}. {self_correction}—no, {revised_impulse}. {uncertain_rationale}."
    };

    return this.templateProcessor.renderDynamic(
      fallbacks[type] ||
      "The {object} presents characteristics consistent with extended {process}, though {anomaly} persists beyond explanation.",
      this.getGenerationContext()
    );
  }

  /**
   * Export engine state for debugging
   */
  exportDebugState() {
    return {
      currentTheme: this.currentTheme,
      currentSanityLevel: this.currentSanityLevel,
      currentGameId: this.currentGameId,
      lexiconVersion: this.lexicon.version,
      termCount: this.getTermCount(),
      templateCount: this.getTemplateCount(),
      playerStateCount: Object.keys(this.playerStates).length
    };
  }

  /**
   * Get template count for debugging
   */
  getTemplateCount() {
    return Object.values(this.templates).reduce(
      (total, templates) => total + (templates ? templates.length : 0),
      0
    );
  }
}

/**
 * Template Processor - handles dynamic template filling
 */
class TemplateProcessor {
  constructor(lexicon) {
    this.lexicon = lexicon;
    this.placeholderPattern = /{([^}]+)}/g;
    this.placeholdersUsed = new Set();
  }

  /**
   * Render a template with context
   */
  renderDynamic(template, context) {
    this.placeholdersUsed.clear();
    let lastSuccess = template;

    try {
      // Replace all placeholders with actual values
      const result = template.replace(this.placeholderPattern, (match, placeholder) => {
        this.placeholdersUsed.add(placeholder);
        return this.resolvePlaceholder(placeholder, context);
      });

      return this.postProcessResult(result);
    } catch (error) {
      // Fallback to last successful intermediate
      console.error('Template rendering failed:', error);
      console.log(`Template: ${template}`);
      return this.postProcessResult(lastSuccess);
    }
  }

  /**
   * Resolve a single placeholder
   */
  resolvePlaceholder(placeholder, context) {
    // Check direct context first
    if (context[placeholder] !== undefined) {
      return context[placeholder];
    }

    // Check special resolvers
    if (placeholder.startsWith('Trigger.')) {
      return this.resolveTrigger(placeholder);
    }

    if (placeholder.startsWith('nouns_from.')) {
      return this.resolveFromVocabulary(placeholder.replace('nouns_from.', ''));
    }

    if (placeholder.startsWith('adjectives.')) {
      const [_, section, category] = placeholder.split('.');
      return this.getRandomThemeAdjective(section, category, context.theme);
    }

    // Check complex expressions
    return this.resolveComplexPlaceholder(placeholder, context);
  }

  /**
   * Resolve complex expressions
   */
  resolveComplexPlaceholder(placeholder, context) {
    const specialCases = {
      'month_change_indication': () => this.getMonthDescriptor(),
      'verb characterize': () => this.getCharacterizingVerb(),
      'evil_symbol_love': () => this.getEvilSymbolDescriptor('love'),
      'character_disorientation': () => this.getDisorientationDescription(),
      'concept_challenges': () => context.concept_challenges?.split('|')[0] || 'misplaced category perception',
      'thematic_expansion': () => this.resolvePlaceholder('+' + context.theme, context)
    };

    if (specialCases[placeholder]) {
      return specialCases[placeholder]();
    }

    // Default fallbacks by type
    if (placeholder.includes('author')) {
      return this.getRandomAuthorDescription();
    }

    if (placeholder.includes('outcome')) {
      return this.getRandomOutcome();
    }

    if (placeholder.includes('date')) {
      return this.getRandomSuppressibleDate();
    }

    return `{{unresolvable:${placeholder}}}`;
  }

  /**
   * Get month descriptor for time passages
   */
  getMonthDescriptor() {
    return this.getRandomListItem([
      'two months', 'three weeks and every day thereafter',
      'sixty-seven eternities scattered through what may or may not have been January',
      'since the twenty-third of last May, though I can no longer remember if that month even occurred'
    ]);
  }

  /**
   * Get verb for characterizing environment
   */
  getCharacterizingVerb() {
    return this.getRandomListItem([
      'announced', 'whispered', 'mouthed silently',
      'formed behind my field of vision but appeared textual upon checking',
      'presented as fact within my memory despite documentary evidence to the contrary'
    ]);
  }

  /**
   * Get descriptor for evil symbols
   */
  getEvilSymbolDescriptor(association) {
    const descriptions = {
      love: [
        'a sigil that promises devotion but delivers possession',
        'carsved hearts whose arrows re-graft to form diagrams of ampipathic masses',
        'a glyph that resolves into closeness when viewed peripherally but distance when focused'
      ],
      time: [
        'clocks with face hand successive levels beyond legible',
        'arow that spirals toward ever-larger escape velocities'
      ]
    };

    return this.getRandomListItem(descriptions[association] || descriptions.love);
  }

  /**
   * Get disorientation description
   */
  getDisorientationDescription() {
    const themes = {
      psychological_horror: [
        'the body position reference systems have decoupled from spatial logic',
        'vertigo has lost its directional specificity—becoming an absolute quality devoid of reference frame',
        'cannot locate locatedness itself'
      ],
      cosmic_horror: [
        "the current vessel's spatial location cannot be expressed in three dimensional mathematics",
        "the concept 'here' lacks topological or dimensional definition"
      ]
    };

    return this.getRandomListItem(themes[context.theme] || themes.psychological_horror);
  }

  /**
   * Resolve trigger-based placeholders
   */
  resolveTrigger(placeholder) {
    const [_, triggerType] = placeholder.split('.');
    if (this.lexicon.base_rules.triggers[triggerType]) {
      return this.getRandomListItem(this.lexicon.base_rules.triggers[triggerType].words) + this.getTriggerEmphasis(triggerType);
    }
    return '';
  }

  /**
   * Get trigger emphasis
   */
  getTriggerEmphasis(triggerType) {
    const trigger = this.lexicon.base_rules.triggers[triggerType];
    if (trigger && trigger.emphasis > 1.0) {
      return this.getRandomListItem([
        ` (${triggerType.toUpperCase()} TRIGGER)`,
        ` <${triggerType.toUpperCase()} ACTIVE>`,
        ` [${triggerType.substring(0, 2).toUpperCase()}-${trigger.emphasis.toFixed(1)}]`
      ]);
    }
    return '';
  }

  /**
   * Resolve from vocabulary section
   */
  resolveFromVocabulary(section) {
    const vocab = this.lexicon.vocabulary;

    // Handle nested sections like "gothic.nouns"
    const sections = section.split('.');
    let current = vocab;

    for (const sec of sections) {
      if (current[sec] === undefined) return '?';
      current = current[sec];
    }

    if (Array.isArray(current)) {
      return this.getRandomListItem(current);
    }

    return current[this.getRandomListItem(Object.keys(current))];
  }

  /**
   * Get random adjective for theme
   */
  getRandomThemeAdjective(section, category, theme) {
    try {
      // Try theme-specific adjectives first
      if (theme && this.lexicon.vocabulary.adjectives[section] &&
          this.lexicon.vocabulary.adjectives[section][theme]) {
        if (this.lexicon.vocabulary.adjectives[section][theme][category]) {
          const themeAdjectives =
            this.lexicon.vocabulary.adjectives[section][theme][category];
          if (Array.isArray(themeAdjectives) && themeAdjectives.length > 0) {
            return this.getRandomListItem(themeAdjectives);
          }
        }
      }

      // Fall back to general adjectives
      if (this.lexicon.vocabulary.adjectives[section] &&
          this.lexicon.vocabulary.adjectives[section][category]) {
        const adjectives = this.lexicon.vocabulary.adjectives[section][category];
        return this.getRandomListItem(adjectives);
      }

      return '?';
    } catch (error) {
      return 'fragile';
    }
  }

  /**
   * Post-process the result for refinement
   */
  postProcessResult(text) {
    // Remove unresolved placeholders
    text = text.replace(/\{\{[^}]+\}\}/g, '');

    // Handle trailing punctuation
    text = text.replace(/\s+([.,!?])/g, '$1');

    // Normalize spaces
    text = text.replace(/\s+/g, ' ').trim();

    // Capitalize first letter if not already
    if (text.length > 0 &&
        text[0].toLowerCase() === text[0] &&
        text[0].toUpperCase() !== text[0]) {
      text = text[0].toUpperCase() + text.substring(1);
    }

    return text;
  }

  /**
   * Fill a simple template with only direct replacements
   */
  fillSimpleTemplate(template, replacements) {
    let result = template;
    Object.entries(replacements).forEach(([key, value]) => {
      result = result.replace(`{${key}}`, value);
    });
    return result;
  }

  /**
   * Get debugging information about template processing
   */
  getDebugInfo() {
    return {
      placeholdersUsed: Array.from(this.placeholdersUsed),
      resolutionErrors: []
    };
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HorrorWritingEngine, TemplateProcessor };
}

// Export for global browser usage
if (typeof window !== 'undefined') {
  window.HorrorWritingEngine = HorrorWritingEngine;
}