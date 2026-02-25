// Caribbean Conquest - Dialogue System
// Phase 3: LLM-powered dynamic dialogue with branching conversations

class DialogueSystem {
    constructor(game) {
        this.game = game;
        
        // Conversation state
        this.activeConversation = null;
        this.conversationHistory = [];
        this.npcPersonalities = new Map();
        
        // Dialogue templates for fallback
        this.dialogueTemplates = {
            pirate: [
                "Arrr! What brings ye to these waters, matey?",
                "Ye lookin' for trouble or treasure?",
                "The sea be angry today. Best watch yer back.",
                "I've seen things in these waters... things that'd make yer blood run cold.",
                "Ye got the look of a captain about ye. Need crew?"
            ],
            navy: [
                "Halt! Identify yourself and state your business.",
                "These waters are under Royal Navy protection.",
                "We're hunting pirates. Have you seen any suspicious activity?",
                "By order of the Crown, you will submit to inspection.",
                "Your papers appear to be in order. Proceed with caution."
            ],
            merchant: [
                "Greetings, traveler! Care to browse my wares?",
                "Business has been slow with all these pirates about.",
                "I have rare spices from the East Indies. Interested?",
                "The trade routes are dangerous these days. Need an escort?",
                "Rumors say there's a treasure fleet sailing through these waters."
            ],
            native: [
                "Welcome, outsider. The spirits watch you.",
                "Our ancestors walked these islands long before your ships arrived.",
                "The land speaks through the wind. Do you listen?",
                "We have ancient artifacts for trade. But beware their power.",
                "The volcano grows restless. A great change is coming."
            ],
            smuggler: [
                "Psst... I've got something special, if you're interested.",
                "Keep your voice down. The navy has ears everywhere.",
                "I know a secret cove where we won't be disturbed.",
                "Some things are best kept off the official records.",
                "I can get you anything... for the right price."
            ],
            cultist: [
                "The ancient ones stir beneath the waves.",
                "Join us in the ritual, and gain power beyond imagining.",
                "The stars are aligning. The time of awakening approaches.",
                "Your soul calls to the deep. Do you hear it?",
                "We seek the lost artifacts of the sunken city."
            ]
        };
        
        // NPC personality traits
        this.personalityTraits = [
            'aggressive', 'friendly', 'suspicious', 'greedy', 'wise',
            'cowardly', 'brave', 'loyal', 'treacherous', 'mysterious',
            'humorous', 'serious', 'optimistic', 'pessimistic', 'curious'
        ];
        
        // Conversation topics
        this.topics = [
            'treasure', 'pirates', 'navy', 'weather', 'trade',
            'rumors', 'danger', 'history', 'magic', 'prophecy',
            'ship repairs', 'crew', 'navigation', 'battles', 'alliances'
        ];
        
        // Initialize narrative generator
        this.narrativeGenerator = null;
        if (typeof NarrativeGenerator !== 'undefined') {
            this.narrativeGenerator = NarrativeGenerator.getInstance();
        }
    }
    
    init() {
        console.log('Dialogue System initialized');
        
        // Generate initial NPC personalities
        this.generateNPCPersonalities();
        
        // Load conversation history
        this.loadHistory();
    }
    
    generateNPCPersonalities() {
        // Generate personalities for each faction
        const factions = ['pirate', 'navy', 'merchant', 'native', 'smuggler', 'cultist'];
        
        for (const faction of factions) {
            // Create 3-5 personality variations per faction
            for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
                const personality = {
                    id: `${faction}_${i}`,
                    faction: faction,
                    traits: this.generateRandomTraits(3),
                    backstory: this.generateBackstory(faction),
                    motivation: this.generateMotivation(faction),
                    knowledge: this.generateKnowledge(faction),
                    attitude: Math.random(), // 0-1 scale (hostile-friendly)
                    trust: 0.5 // Starting trust level
                };
                
                this.npcPersonalities.set(personality.id, personality);
            }
        }
    }
    
    generateRandomTraits(count) {
        const traits = [];
        const available = [...this.personalityTraits];
        
        for (let i = 0; i < count; i++) {
            if (available.length === 0) break;
            const index = Math.floor(Math.random() * available.length);
            traits.push(available.splice(index, 1)[0]);
        }
        
        return traits;
    }
    
    generateBackstory(faction) {
        const backstories = {
            pirate: [
                "Former navy officer turned pirate after being wrongfully accused.",
                "Born into piracy, knows every cove and hideout in the Caribbean.",
                "Escaped slave who now commands his own ship and crew.",
                "Nobleman who abandoned his title for a life of freedom on the seas.",
                "Survivor of a shipwreck who was taken in by pirates."
            ],
            navy: [
                "Career officer from a long line of naval commanders.",
                "Young lieutenant eager to prove himself and earn promotion.",
                "Former pirate hunter with intimate knowledge of pirate tactics.",
                "Strict disciplinarian who follows regulations to the letter.",
                "Idealistic captain who believes in justice and order."
            ],
            merchant: [
                "Third-generation trader with connections across the globe.",
                "Former pirate who went legitimate but still knows the underworld.",
                "Ambitious merchant looking to build a trading empire.",
                "Reluctant trader forced into the business by family debt.",
                "Adventurous explorer who trades rare artifacts from distant lands."
            ],
            native: [
                "Tribal elder who remembers the old ways before the Europeans came.",
                "Young warrior torn between tradition and the new world.",
                "Shaman who communicates with the spirits of land and sea.",
                "Guide who knows every secret path through the islands.",
                "Artisan who creates powerful charms and artifacts."
            ],
            smuggler: [
                "Master of disguise who can slip past any naval blockade.",
                "Former customs officer who knows all the loopholes.",
                "Desperate soul doing whatever it takes to survive.",
                "Criminal genius with plans within plans.",
                "Robin Hood figure who steals from the rich to help the poor."
            ],
            cultist: [
                "Scholar who discovered forbidden knowledge in ancient texts.",
                "Survivor of a shipwreck who was changed by what he saw in the deep.",
                "Descendant of the original inhabitants of a sunken city.",
                "Mystic who hears the whispers of ancient entities.",
                "Power seeker who believes the rituals will grant immortality."
            ]
        };
        
        const stories = backstories[faction] || ["Unknown background."];
        return stories[Math.floor(Math.random() * stories.length)];
    }
    
    generateMotivation(faction) {
        const motivations = {
            pirate: ['wealth', 'freedom', 'revenge', 'power', 'adventure'],
            navy: ['duty', 'honor', 'justice', 'promotion', 'order'],
            merchant: ['profit', 'security', 'legacy', 'expansion', 'stability'],
            native: ['tradition', 'protection', 'balance', 'survival', 'heritage'],
            smuggler: ['survival', 'wealth', 'thrill', 'independence', 'revenge'],
            cultist: ['power', 'knowledge', 'transcendence', 'awakening', 'destiny']
        };
        
        const motives = motivations[faction] || ['unknown'];
        return motives[Math.floor(Math.random() * motives.length)];
    }
    
    generateKnowledge(faction) {
        const knowledgeAreas = {
            pirate: ['hidden coves', 'treasure maps', 'naval weaknesses', 'smuggling routes', 'pirate codes'],
            navy: ['ship specifications', 'naval tactics', 'pirate activity', 'trade routes', 'diplomatic relations'],
            merchant: ['market prices', 'rare goods', 'trade winds', 'port facilities', 'customer preferences'],
            native: ['island secrets', 'herbal remedies', 'ancient ruins', 'weather patterns', 'spiritual sites'],
            smuggler: ['secret passages', 'bribery contacts', 'forgery techniques', 'hidden compartments', 'escape routes'],
            cultist: ['ancient rituals', 'forbidden lore', 'arcane symbols', 'prophetic signs', 'sacred sites']
        };
        
        const areas = knowledgeAreas[faction] || ['general knowledge'];
        // Each NPC knows 2-3 areas
        const count = 2 + Math.floor(Math.random() * 2);
        const knowledge = [];
        const available = [...areas];
        
        for (let i = 0; i < count && available.length > 0; i++) {
            const index = Math.floor(Math.random() * available.length);
            knowledge.push(available.splice(index, 1)[0]);
        }
        
        return knowledge;
    }
    
    startConversation(npcId, playerReputation = 0.5) {
        const personality = this.npcPersonalities.get(npcId);
        if (!personality) {
            console.error(`NPC personality not found: ${npcId}`);
            return null;
        }
        
        // Calculate initial attitude based on reputation and personality
        let baseAttitude = personality.attitude;
        const reputationEffect = playerReputation - 0.5; // -0.5 to +0.5
        baseAttitude += reputationEffect * 0.3;
        
        // Generate opening line
        const openingLine = this.generateOpeningLine(personality, baseAttitude);
        
        this.activeConversation = {
            npcId: npcId,
            personality: personality,
            playerReputation: playerReputation,
            attitude: baseAttitude,
            trust: personality.trust,
            topicsDiscussed: [],
            responses: [
                {
                    speaker: 'npc',
                    text: openingLine,
                    timestamp: Date.now()
                }
            ],
            availableOptions: this.generateResponseOptions(personality, [], baseAttitude)
        };
        
        // Record conversation start
        this.conversationHistory.push({
            npcId: npcId,
            startTime: Date.now(),
            topics: []
        });
        
        return this.activeConversation;
    }
    
    generateOpeningLine(personality, attitude) {
        // Use narrative generator if available
        if (this.narrativeGenerator) {
            try {
                const context = {
                    faction: personality.faction,
                    traits: personality.traits,
                    attitude: attitude > 0.6 ? 'friendly' : attitude < 0.4 ? 'hostile' : 'neutral',
                    location: 'pirate island',
                    timeOfDay: this.game.gameTime % 24 < 12 ? 'day' : 'night'
                };
                
                return this.narrativeGenerator.generateDialogue(context);
            } catch (e) {
                console.warn('Narrative generator failed, using template:', e);
            }
        }
        
        // Fallback to templates
        const templates = this.dialogueTemplates[personality.faction] || this.dialogueTemplates.pirate;
        const template = templates[Math.floor(Math.random() * templates.length)];
        
        // Modify based on attitude
        let line = template;
        if (attitude < 0.3) {
            line = "You dare approach me? " + line;
        } else if (attitude > 0.7) {
            line = "Ah, friend! " + line;
        }
        
        return line;
    }
    
    generateResponseOptions(personality, topicsDiscussed, attitude) {
        const options = [];
        
        // Always available options
        options.push({
            id: 'greet',
            text: 'Greet them politely',
            effect: { trust: 0.05, attitude: 0.05 }
        });
        
        options.push({
            id: 'threaten',
            text: 'Make a threat',
            effect: { trust: -0.1, attitude: -0.15 }
        });
        
        options.push({
            id: 'bribe',
            text: 'Offer a bribe',
            effect: { trust: personality.traits.includes('greedy') ? 0.2 : -0.1, attitude: 0.1 }
        });
        
        // Topic-based options
        const availableTopics = this.topics.filter(topic => !topicsDiscussed.includes(topic));
        const topicCount = Math.min(3, availableTopics.length);
        
        for (let i = 0; i < topicCount; i++) {
            const topic = availableTopics[i];
            const knowsTopic = personality.knowledge.some(k => k.includes(topic) || topic.includes(k));
            
            options.push({
                id: `ask_${topic}`,
                text: `Ask about ${topic}`,
                effect: { 
                    trust: knowsTopic ? 0.1 : 0,
                    attitude: knowsTopic ? 0.05 : -0.05
                },
                topic: topic
            });
        }
        
        // Faction-specific options
        if (personality.faction === 'pirate') {
            options.push({
                id: 'offer_crew',
                text: 'Offer to join their crew',
                effect: { trust: 0.15, attitude: 0.1 }
            });
        } else if (personality.faction === 'merchant') {
            options.push({
                id: 'offer_trade',
                text: 'Propose a trade deal',
                effect: { trust: 0.1, attitude: 0.05 }
            });
        } else if (personality.faction === 'navy') {
            options.push({
                id: 'report_pirates',
                text: 'Report pirate activity',
                effect: { trust: 0.2, attitude: 0.1 }
            });
        }
        
        // End conversation option
        options.push({
            id: 'end',
            text: 'End conversation',
            effect: { trust: 0, attitude: 0 }
        });
        
        return options;
    }
    
    playerRespond(optionId) {
        if (!this.activeConversation) {
            console.error('No active conversation');
            return null;
        }
        
        const option = this.activeConversation.availableOptions.find(opt => opt.id === optionId);
        if (!option) {
            console.error(`Invalid option: ${optionId}`);
            return null;
        }
        
        const personality = this.activeConversation.personality;
        
        // Record player response
        this.activeConversation.responses.push({
            speaker: 'player',
            text: option.text,
            timestamp: Date.now(),
            optionId: optionId
        });
        
        // Apply effects
        this.activeConversation.trust += option.effect.trust;
        this.activeConversation.attitude += option.effect.attitude;
        
        // Clamp values
        this.activeConversation.trust = Math.max(0, Math.min(1, this.activeConversation.trust));
        this.activeConversation.attitude = Math.max(0, Math.min(1, this.activeConversation.attitude));
        
        // Update NPC personality trust
        personality.trust = this.activeConversation.trust;
        
        // Record topic if applicable
        if (option.topic) {
            this.activeConversation.topicsDiscussed.push(option.topic);
        }
        
        // Generate NPC response
        const npcResponse = this.generateNPCResponse(personality, option);
        this.activeConversation.responses.push({
            speaker: 'npc',
            text: npcResponse,
            timestamp: Date.now()
        });
        
        // Generate new response options
        this.activeConversation.availableOptions = this.generateResponseOptions(
            personality,
            this.activeConversation.topicsDiscussed,
            this.activeConversation.attitude
        );
        
        // Check if conversation should end
        if (optionId === 'end' || this.activeConversation.trust < 0.1 || this.activeConversation.attitude < 0.1) {
            this.endConversation();
            return {
                ended: true,
                conversation: this.activeConversation
            };
        }
        
        return this.activeConversation;
    }
    
    generateNPCResponse(personality, playerOption) {
        // Use narrative generator if available
        if (this.narrativeGenerator && Math.random() > 0.5) {
            try {
                const context = {
                    faction: personality.faction,
                    traits: personality.traits,
                    playerAction: playerOption.text,
                    attitude: this.activeConversation.attitude > 0.6 ? 'friendly' : 
                              this.activeConversation.attitude < 0.4 ? 'hostile' : 'neutral',
                    trust: this.activeConversation.trust
                };
                
                return this.narrativeGenerator.generateDialogue(context);
            } catch (e) {
                console.warn('Narrative generator failed, using template:', e);
            }
        }
        
        // Generate response based on option type
        let response = '';
        
        if (playerOption.id.startsWith('ask_')) {
            const topic = playerOption.id.replace('ask_', '');
            const knowsTopic = personality.knowledge.some(k => k.includes(topic) || topic.includes(k));
            
            if (knowsTopic) {
                response = this.generateKnowledgeResponse(personality, topic);
            } else {
                response = "I don't know much about that. Ask me something else.";
            }
        } else if (playerOption.id === 'greet') {
            response = personality.attitude > 0.5 ? 
                "Well met, traveler." : 
                "What do you want?";
        } else if (playerOption.id === 'threaten') {
            response = personality.traits.includes('cowardly') ?
                "Please, no violence!" :
                "You dare threaten me? You'll regret that!";
        } else if (playerOption.id === 'bribe') {
            response = personality.traits.includes('greedy') ?
                "Now we're talking! What do you need?" :
                "I'm not for sale!";
        } else {
            // Generic response
            const templates = this.dialogueTemplates[personality.faction] || this.dialogueTemplates.pirate;
            response = templates[Math.floor(Math.random() * templates.length)];
        }
        
        return response;
    }
    
    generateKnowledgeResponse(personality, topic) {
        const knowledgeResponses = {
            treasure: [
                "I've heard rumors of Spanish gold hidden in the caves to the north.",
                "The old pirate captain Blackbeard buried his treasure somewhere on this island.",
                "There's a map to a treasure fleet wreck in the possession of the merchant guild."
            ],
            pirates: [
                "The pirate fleet gathers at Skull Island when the moon is full.",
                "Captain Redbeard is the most feared pirate in these waters.",
                "Pirates have a secret code: three shots fired means danger."
            ],
            navy: [
                "The Royal Navy is planning a major offensive against pirate strongholds.",
                "Naval patrols increase during the full moon.",
                "The navy's flagship, HMS Victory, is rumored to be carrying royal treasure."
            ],
            weather: [
                "A great storm approaches from the east. Batten down the hatches.",
                "The trade winds shift with the seasons. Now is the time to sail west.",
                "Beware the waterspouts that form near the volcanic islands."
            ],
            rumors: [
                "They say a ghost ship haunts these waters, appearing only at midnight.",
                "There's talk of a sea monster that drags ships to the depths.",
                "Whispers speak of a fountain of youth hidden in the jungle."
            ]
        };
        
        const responses = knowledgeResponses[topic] || ["I've heard something about that, but the details escape me."];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    endConversation() {
        if (!this.activeConversation) return;
        
        // Record conversation end
        const historyEntry = this.conversationHistory.find(h => 
            h.npcId === this.activeConversation.npcId && !h.endTime
        );
        
        if (historyEntry) {
            historyEntry.endTime = Date.now();
            historyEntry.duration = historyEntry.endTime - historyEntry.startTime;
            historyEntry.topics = this.activeConversation.topicsDiscussed;
            historyEntry.finalTrust = this.activeConversation.trust;
            historyEntry.finalAttitude = this.activeConversation.attitude;
        }
        
        // Clear active conversation
        this.activeConversation = null;
        
        // Save history
        this.saveHistory();
    }
    
    generateRumor() {
        // Generate a random rumor based on world state
        const factions = ['pirate', 'navy', 'merchant', 'native', 'smuggler', 'cultist'];
        const faction = factions[Math.floor(Math.random() * factions.length)];
        
        const rumorTypes = [
            "treasure discovery",
            "naval movement",
            "pirate attack",
            "supernatural event",
            "political intrigue",
            "natural disaster"
        ];
        
        const rumorType = rumorTypes[Math.floor(Math.random() * rumorTypes.length)];
        
        // Use narrative generator if available
        if (this.narrativeGenerator) {
            try {
                return this.narrativeGenerator.generateRumor({
                    faction: faction,
                    type: rumorType,
                    location: 'the Caribbean',
                    credibility: 0.5 + Math.random() * 0.5
                });
            } catch (e) {
                console.warn('Narrative generator failed for rumor:', e);
            }
        }
        
        // Fallback rumor
        const rumors = [
            `Rumors say the ${faction}s have discovered a great treasure.`,
            `Whispers speak of a ${rumorType} that will change everything.`,
            `I've heard the ${faction}s are planning something big.`,
            `There's talk of a ${rumorType} involving the ${faction}s.`
        ];
        
        return rumors[Math.floor(Math.random() * rumors.length)];
    }
    
    update(dt) {
        // Update conversation timers if needed
        if (this.activeConversation) {
            // Auto-end conversation if inactive for too long
            const lastResponse = this.activeConversation.responses[this.activeConversation.responses.length - 1];
            if (lastResponse && Date.now() - lastResponse.timestamp > 30000) { // 30 seconds
                this.endConversation();
            }
        }
    }
    
    saveHistory() {
        try {
            localStorage.setItem('caribbean_dialogue_history', 
                JSON.stringify(this.conversationHistory.slice(-50))); // Keep last 50 conversations
        } catch (e) {
            // LocalStorage might not be available
        }
    }
    
    loadHistory() {
        try {
            const saved = localStorage.getItem('caribbean_dialogue_history');
            if (saved) {
                this.conversationHistory = JSON.parse(saved);
            }
        } catch (e) {
            // Use empty history
        }
    }
    
    getConversationSummary() {
        return {
            totalConversations: this.conversationHistory.length,
            active: this.activeConversation ? true : false,
            npcCount: this.npcPersonalities.size,
            averageTrust: this.calculateAverageTrust()
        };
    }
    
    calculateAverageTrust() {
        if (this.npcPersonalities.size === 0) return 0;
        
        let total = 0;
        for (const personality of this.npcPersonalities.values()) {
            total += personality.trust;
        }
        
        return total / this.npcPersonalities.size;
    }
}
