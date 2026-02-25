/**
 * LLM-Powered Narrative Generation
 * 
 * Generates dynamic horror narratives using Ollama integration.
 * Creates personalized quest lines, dialogue, lore, and plot twists
 * based on player fear profiles and game context.
 * 
 * @module core/procedural/narrative
 */

const NarrativeGenerator = (function() {
    'use strict';

    // Narrative templates for fallback when LLM is unavailable
    const NARRATIVE_TEMPLATES = {
        quest: [
            "The {adjective} {entity} has been spotted in {location}. You must {objective} before {timeLimit}.",
            "Ancient whispers speak of a {adjective} {artifact} hidden in {location}. Find it and {objective}.",
            "The spirits of {location} demand a sacrifice. You must {objective} to appease them.",
            "A survivor's last message mentioned {entity} lurking in {location}. Investigate and {objective}.",
            "The {adjective} darkness spreads from {location}. Stop it by {objective}."
        ],
        dialogue: [
            "You shouldn't be here... {warning}",
            "They're watching... {hint}",
            "I've seen what lurks in {location}. {advice}",
            "The {entity}... it took everyone. {emotion}",
            "Listen carefully. You have {timeLimit} to {objective}."
        ],
        lore: [
            "Long ago, {location} was a place of {positiveTrait}. Then came the {negativeEvent}.",
            "The first victim was {victim}. Their spirit still haunts {location}.",
            "According to ancient texts, the {entity} was created when {origin}.",
            "Survivors speak of the {adjective} night when {event} changed everything.",
            "The truth about {location} was buried with {person}. Until now."
        ],
        twist: [
            "The {entity} you've been fighting... it was protecting you from {trueThreat}.",
            "{ally} has been {betrayal} all along.",
            "The {objective} you completed... it was exactly what {villain} wanted.",
            "You're not the first to come here. The previous {role} became {fate}.",
            "The {location} isn't haunted by ghosts. It's haunted by {unexpected}."
        ],
        ambient: [
            "A cold breeze whispers through the {location}.",
            "Distant {sound} echoes from the darkness.",
            "The shadows seem to {movement} when you're not looking.",
            "You feel an overwhelming sense of {emotion}.",
            "Something {adjective} lurks just beyond your vision."
        ]
    };

    // Fear-based narrative modifiers
    const FEAR_MODIFIERS = {
        darkness: {
            adjectives: ['pitch-black', 'lightless', 'shadowy', 'obscured', 'tenebrous'],
            entities: ['shadow creature', 'darkness entity', 'void walker', 'shade'],
            locations: ['abyss', 'dark corridor', 'lightless chamber', 'shadow realm']
        },
        jumpscares: {
            adjectives: ['sudden', 'shocking', 'startling', 'abrupt', 'violent'],
            entities: ['jumpscare monster', 'ambush predator', 'shock spirit'],
            locations: ['corner', 'doorway', 'hidden passage', 'blind spot']
        },
        chase: {
            adjectives: ['relentless', 'pursuing', 'hunting', 'stalking', 'chasing'],
            entities: ['pursuer', 'hunter', 'chase demon', 'stalker'],
            locations: ['corridor', 'maze', 'labyrinth', 'endless hallway']
        },
        psychological: {
            adjectives: ['mind-bending', 'disturbing', 'unsettling', 'twisted', 'warped'],
            entities: ['psychic entity', 'mind flayer', 'illusion spirit', 'madness'],
            locations: ['asylum', 'twisted reality', 'mental landscape', 'nightmare']
        },
        gore: {
            adjectives: ['bloody', 'gory', 'visceral', 'horrific', 'gruesome'],
            entities: ['flesh monster', 'blood demon', 'gore spirit', 'carrion beast'],
            locations: ['abattoir', 'blood chamber', 'carnage hall', 'gore pit']
        },
        isolation: {
            adjectives: ['lonely', 'abandoned', 'desolate', 'forsaken', 'isolated'],
            entities: ['lonely spirit', 'abandoned soul', 'forgotten one', 'isolation entity'],
            locations: ['empty building', 'desolate wasteland', 'abandoned facility', 'void']
        },
        uncanny: {
            adjectives: ['uncanny', 'unnerving', 'wrong', 'distorted', 'almost-human'],
            entities: ['doppelganger', 'uncanny valley entity', 'mimic', 'false human'],
            locations: ['uncanny house', 'distorted reality', 'almost-normal place']
        },
        sound: {
            adjectives: ['deafening', 'whispering', 'screaming', 'haunting', 'eerie'],
            entities: ['sound entity', 'whisper spirit', 'scream demon', 'echo'],
            locations: ['echo chamber', 'soundless void', 'whispering hall', 'scream pit']
        }
    };

    /**
     * Narrative Generator class
     */
    class NarrativeGenerator {
        /**
         * Create a narrative generator
         * @param {Object} config - Configuration
         * @param {string} config.ollamaEndpoint - Ollama API endpoint
         * @param {string} config.model - Ollama model to use
         */
        constructor(config = {}) {
            this.ollamaEndpoint = config.ollamaEndpoint || '/api/ollama';
            this.model = config.model || 'llama2';
            this.cache = new Map();
            this.useOllama = config.useOllama !== false;
            this.available = true;
        }

        /**
         * Check if Ollama is available
         * @returns {Promise<boolean>} Availability
         */
        async checkAvailability() {
            try {
                const response = await fetch(this.ollamaEndpoint + '/health', {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });
                this.available = response.ok;
                return this.available;
            } catch (e) {
                this.available = false;
                return false;
            }
        }

        /**
         * Generate a quest narrative
         * @param {Object} context - Game context
         * @param {Object} playerProfile - Player's fear profile
         * @returns {Promise<Object>} Generated quest
         */
        async generateQuest(context, playerProfile) {
            const cacheKey = `quest_${JSON.stringify({ context, fears: playerProfile?.fears })}`;
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            if (this.useOllama && this.available) {
                try {
                    const result = await this._callOllama(this._buildQuestPrompt(context, playerProfile));
                    const quest = this._parseQuestResponse(result);
                    this.cache.set(cacheKey, quest);
                    return quest;
                } catch (e) {
                    console.warn('Ollama failed, using templates:', e);
                }
            }

            // Fallback to template-based generation
            const quest = this._generateTemplateQuest(context, playerProfile);
            this.cache.set(cacheKey, quest);
            return quest;
        }

        /**
         * Generate NPC dialogue
         * @param {string} character - Character name/type
         * @param {string} situation - Current situation
         * @param {string} playerAction - Player's recent action
         * @returns {Promise<string>} Generated dialogue
         */
        async generateDialogue(character, situation, playerAction) {
            const cacheKey = `dialogue_${character}_${situation}_${playerAction}`;
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            if (this.useOllama && this.available) {
                try {
                    const prompt = `Generate a short, creepy dialogue line for a horror game.
Character: ${character}
Situation: ${situation}
Player just: ${playerAction}

The dialogue should be 1-2 sentences, mysterious and unsettling.
Return only the dialogue, nothing else.`;

                    const result = await this._callOllama(prompt);
                    const dialogue = result.trim();
                    this.cache.set(cacheKey, dialogue);
                    return dialogue;
                } catch (e) {
                    console.warn('Ollama failed, using templates:', e);
                }
            }

            const dialogue = this._generateTemplateDialogue(character, situation, playerAction);
            this.cache.set(cacheKey, dialogue);
            return dialogue;
        }

        /**
         * Generate lore fragment
         * @param {string} location - Location name
         * @param {Object} discoveredBy - Player who discovered it
         * @returns {Promise<string>} Generated lore
         */
        async generateLoreFragment(location, discoveredBy) {
            const cacheKey = `lore_${location}`;
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            if (this.useOllama && this.available) {
                try {
                    const prompt = `Generate a short lore entry for a horror game location.
Location: ${location}

The lore should be 2-3 sentences, revealing something dark about the location's history.
Return only the lore text, nothing else.`;

                    const result = await this._callOllama(prompt);
                    const lore = result.trim();
                    this.cache.set(cacheKey, lore);
                    return lore;
                } catch (e) {
                    console.warn('Ollama failed, using templates:', e);
                }
            }

            const lore = this._generateTemplateLore(location);
            this.cache.set(cacheKey, lore);
            return lore;
        }

        /**
         * Generate a plot twist
         * @param {Object} situation - Current story situation
         * @returns {Promise<string>} Generated twist
         */
        async generateTwist(situation) {
            const cacheKey = `twist_${JSON.stringify(situation)}`;
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            if (this.useOllama && this.available) {
                try {
                    const prompt = `Generate a shocking plot twist for a horror game.
Current situation: ${JSON.stringify(situation)}

The twist should completely change the player's understanding of the situation.
Return only the twist, 1-2 sentences.`;

                    const result = await this._callOllama(prompt);
                    const twist = result.trim();
                    this.cache.set(cacheKey, twist);
                    return twist;
                } catch (e) {
                    console.warn('Ollama failed, using templates:', e);
                }
            }

            const twist = this._generateTemplateTwist(situation);
            this.cache.set(cacheKey, twist);
            return twist;
        }

        /**
         * Generate ambient horror text
         * @param {Object} context - Current game context
         * @returns {Promise<string>} Ambient text
         */
        async generateAmbient(context) {
            const cacheKey = `ambient_${Date.now()}`; // Don't cache ambient

            if (this.useOllama && this.available) {
                try {
                    const prompt = `Generate a single sentence of ambient horror text.
Context: ${JSON.stringify(context)}

Make it atmospheric and unsettling. Return only the sentence.`;

                    const result = await this._callOllama(prompt);
                    return result.trim();
                } catch (e) {
                    console.warn('Ollama failed, using templates:', e);
                }
            }

            return this._generateTemplateAmbient(context);
        }

        /**
         * Call Ollama API
         * @param {string} prompt - Prompt to send
         * @returns {Promise<string>} Generated text
         */
        async _callOllama(prompt) {
            const response = await fetch(this.ollamaEndpoint + '/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.8,
                        top_p: 0.9,
                        max_tokens: 200
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }

            const data = await response.json();
            return data.response || data.text || '';
        }

        /**
         * Build quest prompt for Ollama
         * @param {Object} context - Game context
         * @param {Object} playerProfile - Player profile
         * @returns {string} Prompt
         */
        _buildQuestPrompt(context, playerProfile) {
            const primaryFear = this._getPrimaryFear(playerProfile);
            const fearData = FEAR_MODIFIERS[primaryFear] || FEAR_MODIFIERS.darkness;

            return `Generate a horror game quest with the following structure:
{
    "title": "Quest Title",
    "objective": "What the player must do",
    "description": "2-3 sentence quest description",
    "location": "Where the quest takes place",
    "entity": "Main antagonist or threat",
    "reward": "What the player gets",
    "timeLimit": "Optional time pressure"
}

Player's primary fear: ${primaryFear}
Game context: ${JSON.stringify(context)}

Make the quest personalized to exploit the player's fear of ${primaryFear}.
Return only valid JSON, no other text.`;
        }

        /**
         * Parse Ollama quest response
         * @param {string} response - Ollama response
         * @returns {Object} Parsed quest
         */
        _parseQuestResponse(response) {
            try {
                // Try to extract JSON from response
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (e) {
                console.warn('Failed to parse quest JSON:', e);
            }

            // Fallback structure
            return {
                title: "The Dark Quest",
                objective: "Survive and escape",
                description: response,
                location: "Unknown",
                entity: "Darkness",
                reward: "Survival",
                timeLimit: null
            };
        }

        /**
         * Generate quest using templates
         * @param {Object} context - Game context
         * @param {Object} playerProfile - Player profile
         * @returns {Object} Generated quest
         */
        _generateTemplateQuest(context, playerProfile) {
            const primaryFear = this._getPrimaryFear(playerProfile);
            const fearData = FEAR_MODIFIERS[primaryFear] || FEAR_MODIFIERS.darkness;

            const template = NARRATIVE_TEMPLATES.quest[
                Math.floor(Math.random() * NARRATIVE_TEMPLATES.quest.length)
            ];

            const quest = {
                title: this._generateTitle(primaryFear),
                objective: this._pickRandom(['escape', 'survive', 'find the truth', 'defeat the entity', 'seal the darkness']),
                description: this._fillTemplate(template, {
                    adjective: this._pickRandom(fearData.adjectives),
                    entity: this._pickRandom(fearData.entities),
                    location: this._pickRandom(fearData.locations),
                    timeLimit: this._pickRandom(['time runs out', 'the entity finds you', 'darkness consumes all'])
                }),
                location: this._pickRandom(fearData.locations),
                entity: this._pickRandom(fearData.entities),
                reward: this._pickRandom(['survival', 'truth', 'power', 'escape', 'peace']),
                timeLimit: Math.random() > 0.5 ? this._pickRandom(['5 minutes', '10 minutes', 'until midnight']) : null
            };

            return quest;
        }

        /**
         * Generate dialogue using templates
         * @param {string} character - Character
         * @param {string} situation - Situation
         * @param {string} playerAction - Player action
         * @returns {string} Generated dialogue
         */
        _generateTemplateDialogue(character, situation, playerAction) {
            const template = NARRATIVE_TEMPLATES.dialogue[
                Math.floor(Math.random() * NARRATIVE_TEMPLATES.dialogue.length)
            ];

            return this._fillTemplate(template, {
                warning: this._pickRandom(['Leave while you can.', 'It sees you.', 'You\'re not safe here.']),
                hint: this._pickRandom(['Check the shadows.', 'Listen carefully.', 'Trust no one.']),
                advice: this._pickRandom(['Stay in the light.', 'Move quietly.', 'Don\'t look back.']),
                emotion: this._pickRandom(['I can\'t stop screaming.', 'I\'ve gone mad.', 'Nothing matters now.'])
            });
        }

        /**
         * Generate lore using templates
         * @param {string} location - Location
         * @returns {string} Generated lore
         */
        _generateTemplateLore(location) {
            const template = NARRATIVE_TEMPLATES.lore[
                Math.floor(Math.random() * NARRATIVE_TEMPLATES.lore.length)
            ];

            return this._fillTemplate(template, {
                location: location,
                positiveTrait: this._pickRandom(['peace', 'light', 'happiness', 'prosperity']),
                negativeEvent: this._pickRandom(['curse', 'plague', 'demon summoning', 'massacre']),
                victim: this._pickRandom(['innocent child', 'mad scientist', 'cursed priest', 'lost traveler']),
                origin: this._pickRandom(['ancient ritual gone wrong', 'experiment', 'betrayal', 'accident'])
            });
        }

        /**
         * Generate twist using templates
         * @param {Object} situation - Situation
         * @returns {string} Generated twist
         */
        _generateTemplateTwist(situation) {
            const template = NARRATIVE_TEMPLATES.twist[
                Math.floor(Math.random() * NARRATIVE_TEMPLATES.twist.length)
            ];

            return this._fillTemplate(template, {
                trueThreat: this._pickRandom(['the real horror within', 'your own mind', 'the void beyond']),
                betrayal: this._pickRandom(['working against you', 'leading you to death', 'sacrificing you']),
                villain: this._pickRandom(['the darkness', 'the entity', 'fate itself']),
                role: this._pickRandom(['explorer', 'victim', 'sacrifice']),
                fate: this._pickRandom(['one of them', 'a ghost', 'part of the horror']),
                unexpected: this._pickRandom(['memories', 'regrets', 'forgotten sins'])
            });
        }

        /**
         * Generate ambient text using templates
         * @param {Object} context - Context
         * @returns {string} Ambient text
         */
        _generateTemplateAmbient(context) {
            const template = NARRATIVE_TEMPLATES.ambient[
                Math.floor(Math.random() * NARRATIVE_TEMPLATES.ambient.length)
            ];

            return this._fillTemplate(template, {
                location: this._pickRandom(['corridor', 'room', 'hallway', 'chamber']),
                sound: this._pickRandom(['scratching', 'whispers', 'footsteps', 'breathing']),
                movement: this._pickRandom(['shift', 'crawl', 'dance', 'twitch']),
                emotion: this._pickRandom(['dread', 'terror', 'unease', 'panic']),
                adjective: this._pickRandom(['terrible', 'unspeakable', 'horrific', 'nightmarish'])
            });
        }

        /**
         * Get player's primary fear
         * @param {Object} playerProfile - Player profile
         * @returns {string} Primary fear
         */
        _getPrimaryFear(playerProfile) {
            if (!playerProfile?.fears) return 'darkness';

            const fears = playerProfile.fears;
            let maxScore = 0;
            let primaryFear = 'darkness';

            for (const [fear, score] of Object.entries(fears)) {
                if (score > maxScore) {
                    maxScore = score;
                    primaryFear = fear;
                }
            }

            return primaryFear;
        }

        /**
         * Pick random item from array
         * @param {Array} array - Array to pick from
         * @returns {*} Random item
         */
        _pickRandom(array) {
            if (!array || array.length === 0) return 'unknown';
            return array[Math.floor(Math.random() * array.length)];
        }

        /**
         * Fill template placeholders
         * @param {string} template - Template string
         * @param {Object} values - Values to fill
         * @returns {string} Filled template
         */
        _fillTemplate(template, values) {
            let result = template;
            for (const [key, value] of Object.entries(values)) {
                result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
            }
            return result;
        }

        /**
         * Generate quest title
         * @param {string} fear - Fear type
         * @returns {string} Title
         */
        _generateTitle(fear) {
            const prefixes = ['The', 'Into the', 'Escape from', 'Curse of', 'Shadows of'];
            const fearTitles = {
                darkness: ['Darkness', 'Void', 'Shadows', 'Abyss', 'Night'],
                jumpscares: ['Shock', 'Terror', 'Sudden Death', 'Ambush', 'Panic'],
                chase: ['Pursuit', 'Hunt', 'Escape', 'Stalker', 'Flight'],
                psychological: ['Madness', 'Mind', 'Illusion', 'Nightmare', 'Psyche'],
                gore: ['Blood', 'Carnage', 'Slaughter', 'Viscera', 'Horror'],
                isolation: ['Loneliness', 'Abandonment', 'Solitude', 'Void', 'Emptiness'],
                uncanny: ['Uncanny', 'Wrongness', 'Distortion', 'False Reality', 'Mimicry'],
                sound: ['Whispers', 'Screams', 'Echoes', 'Silence', 'Noise']
            };

            const titleSet = fearTitles[fear] || fearTitles.darkness;
            return `${this._pickRandom(prefixes)} ${this._pickRandom(titleSet)}`;
        }

        /**
         * Clear the cache
         * @param {string} key - Optional specific key to clear
         */
        clearCache(key) {
            if (key) {
                this.cache.delete(key);
            } else {
                this.cache.clear();
            }
        }

        /**
         * Get cache statistics
         * @returns {Object} Cache stats
         */
        getCacheStats() {
            return {
                size: this.cache.size,
                available: this.available,
                useOllama: this.useOllama
            };
        }
    }

    // Singleton instance
    let instance = null;

    /**
     * Get or create the narrative generator instance
     * @param {Object} config - Configuration
     * @returns {NarrativeGenerator} Instance
     */
    function getInstance(config) {
        if (!instance) {
            instance = new NarrativeGenerator(config);
        }
        return instance;
    }

    // Public API
    return {
        NarrativeGenerator,
        getInstance,
        FEAR_MODIFIERS,
        NARRATIVE_TEMPLATES,
        VERSION: '1.0.0'
    };
})();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NarrativeGenerator;
} else if (typeof window !== 'undefined') {
    window.NarrativeGenerator = NarrativeGenerator;
}
