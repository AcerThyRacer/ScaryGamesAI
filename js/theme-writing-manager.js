/**
 * ThemeWritingManager - Phase 1 Implementation
 * Core horror writing theme system with 7 foundational themes
 *
 * Features:
 * - 7 core horror writing themes (gore, supernatural, post-apocalyptic, fantasy, sci-fi, psychological, cosmic)
 * - Theme-specific vocabulary and writing rules
 * - Dynamic content generation based on theme
 * - Environmental storytelling integration
 * - Character dialogue generation
 * - Game integration hooks
 * - Theme switching with persistence
 */

(function() {
    'use strict';

    // Theme constants - Expanded for Phase 1
    const THEMES = {
        DEFAULT: 'default',
        HORROR: 'horror',
        GORE: 'gore',
        SUPERNATURAL: 'supernatural',
        POST_APOCALYPTIC: 'post_apocalyptic',
        FANTASY: 'fantasy',
        SCI_FI: 'sci_fi',
        PSYCHOLOGICAL: 'psychological',
        COSMIC: 'cosmic',
        // Expanded themes for Phase 1
        BODY_HORROR: 'body_horror',
        FOLK_HORROR: 'folk_horror',
        LOVECRAFTIAN: 'lovecraftian',
        TECHNOLOGICAL: 'technological',
        URBAN_LEGEND: 'urban_legend',
        FOUND_FOOTAGE: 'found_footage',
        APOCALYPTIC: 'apocalyptic'
    };

    // Expanded theme descriptions for Phase 1
    const THEME_DESCRIPTIONS = {
        [THEMES.GORE]: "Extreme violence, visceral horror, body horror - where the terror comes from the physical transformation and destruction of the body.",
        [THEMES.SUPERNATURAL]: "Ghosts, hauntings, curses, possession, ancient evils - entities that defy natural law and challenge human understanding.",
        [THEMES.POST_APOCALYPTIC]: "Survival in a ruined world, collapse of civilization, remnants of humanity struggling against what comes after.",
        [THEMES.FANTASY]: "Dark fantasy, cursed magic, ancient curses - where the supernatural is woven into the fabric of reality itself.",
        [THEMES.SCI_FI]: "Cosmic horror meets technology, AI gone wrong, scientific experiments that should never have been conducted.",
        [THEMES.PSYCHOLOGICAL]: "Fear of losing one's mind, gaslighting, reality distortion - where the greatest horror comes from within.",
        [THEMES.COSMIC]: "Humanity's insignificance, elder gods, incomprehensible entities - the terror of the infinite and unknowable.",
        // Expanded themes for Phase 1
        [THEMES.BODY_HORROR]: "Physical transformation, mutation, disease, the violation of the human form - where the body becomes the source of terror.",
        [THEMES.FOLK_HORROR]: "Ancient rituals, rural isolation, pagan traditions, the terror of the old ways and forgotten knowledge.",
        [THEMES.LOVECRAFTIAN]: "Elder gods, forbidden knowledge, madness from revelation, the terror of the incomprehensible and vast cosmic forces.",
        [THEMES.TECHNOLOGICAL]: "AI rebellion, cybernetic horror, virtual reality nightmares, the terror of technology turning against its creators.",
        [THEMES.URBAN_LEGEND]: "Modern myths, internet horror, creepypasta, the terror that hides in everyday life and spreads through stories.",
        [THEMES.FOUND_FOOTAGE]: "Documentary-style horror, lost recordings, the terror of authenticity and the blurred line between fiction and reality.",
        [THEMES.APOCALYPTIC]: "The end of the world, catastrophic events, survival in the face of global annihilation - the terror of impending doom."
    };

    // Theme configuration
    const THEME_CONFIGS = {
        [THEMES.DEFAULT]: {
            id: THEMES.DEFAULT,
            name: "Default Horror",
            description: "Classic horror with balanced elements",
            icon: "👁️",
            class: "writing-theme-default",
            writing_rules: {
                message: "Standard horror writing rules apply"
            },
            assets: {
                icons: {
                    themeIcon: "👁️",
                    menuIcon: "👁️",
                    loadingIcon: "👁️"
                },
                colors: {
                    primary: "#3a2a2a",
                    text: "#e8d8c0"
                }
            },
            content: {
                location_descriptions: {
                    generic_location: [
                        "The {location} appears {adjective}, though {uncertainty} lingers in the {atmosphere}.",
                        "Something about the {location} feels {wrong|off|unnatural}, as if {observation}.",
                        "The {location} {verb} with an eerie {quality}, hinting at {implication}."
                    ]
                },
                character_dialog: {
                    reassurance: [
                        "It's probably just {innocuous_explanation}. Nothing to worry about.",
                        "Don't be {emotion}. {observation} is completely normal.",
                        "You're imagining things. {reassuring_statement}."
                    ],
                    doubt: [
                        "Something's not right. {observation} doesn't make sense.",
                        "This can't be happening. {reality_denial}.",
                        "I don't remember {memory_gap}. Do you?"
                    ],
                    realization: [
                        "Wait... {horrifying_discovery}. That explains everything.",
                        "Oh no. {terrible_truth}. We have to {action}.",
                        "I think I understand now. {revelation}."
                    ],
                    denial: [
                        "This can't be happening. {reality_denial}.",
                        "There must be a rational explanation. {attempted_explanation}.",
                        "No, no, no. {repetition} This isn't real."
                    ]
                },
                game_descriptions: {
                    templates: [
                        "Navigate {location} filled with {threat}. {objective} before {consequence}.",
                        "Survive against {enemy} in {setting}. {unique_mechanic} makes this experience truly terrifying.",
                        "Uncover the secrets of {mystery} in {location}. {twist} will change everything you thought you knew.",
                        "Escape from {dangerous_place} where {threat} lurks. {gameplay_mechanic} keeps you on edge.",
                        "Investigate {phenomenon} in {location}. {revelation} will challenge your perception of reality."
                    ],
                    neologisms: ["void_swell", "epistemic_flux", "semantic_elongation", "conceptual_thinning"],
                    concepts: [
                        "the boundary between {concept1} and {concept2} begins to dissolve",
                        "what was once {familiar} becomes {unfamiliar} under scrutiny",
                        "the rules governing {system} no longer apply in this context"
                    ]
                }
            }
        },
        [THEMES.HORROR]: {
            id: THEMES.HORROR,
            name: "Classic Horror",
            description: "Traditional horror with balanced elements - ghosts, monsters, and the unknown that hides in the dark.",
            icon: "👻",
            class: "writing-theme-horror",
            writing_rules: {
                message: "Balanced horror writing with a mix of psychological and supernatural elements.",
                sentence_structure: {
                    complexity_normal: 0.6,
                    fragment_probability: 0.2,
                    ellipsis_probability: 0.15
                }
            },
            assets: {
                icons: {
                    themeIcon: "👻",
                    menuIcon: "👻",
                    loadingIcon: "👻"
                },
                colors: {
                    primary: "#2a1a1a",
                    "primary-dark": "#1a0f0f",
                    secondary: "#3a2a2a",
                    "text-primary": "#e8d8c0",
                    "text-secondary": "#b8a999",
                    accent: "#cc1122",
                    shadow: "rgba(204, 17, 34, 0.3)",
                    glow: "rgba(204, 17, 34, 0.2)"
                }
            },
            content: {
                location_descriptions: {
                    generic_location: [
                        "The {location} looms before you, its {feature} casting long, {adjective} shadows that seem to {verb} of their own accord.",
                        "A {adjective} silence hangs over the {location}, broken only by the occasional {sound} that makes your {body_part} {reaction}.",
                        "The air in the {location} is thick with {atmosphere}, carrying the faint scent of {smell} that shouldn't be there."
                    ],
                    abandoned_hospital: [
                        "The abandoned hospital {verb} with the weight of countless {tragedy}, its {feature} peeling away to reveal {hidden_truth}.",
                        "Flickering {light_source} cast eerie shadows across the {surface}, hinting at {presence} that shouldn't exist.",
                        "The {equipment} lies abandoned, still bearing the {evidence} of the {event} that forced this place to close."
                    ],
                    haunted_house: [
                        "The house {verb} with an otherworldly {quality}, its {feature} warped by {force} beyond human comprehension.",
                        "Every creak of the {structure} sounds like {sound}, every shadow could hide {entity}.",
                        "The air smells of {smell} and {emotion}, as if the very atmosphere remembers the {tragedy}."
                    ]
                },
                character_dialog: {
                    reassurance: [
                        "It's just the {innocuous_explanation}. Happens all the time around here.",
                        "Don't worry about the {disturbing_thing}. It's probably just {rational_explanation}.",
                        "You're overreacting. {observation} is completely normal in these parts."
                    ],
                    doubt: [
                        "Something's not right. {observation} doesn't match what I remember.",
                        "This can't be happening. {reality_denial}. There must be an explanation.",
                        "I don't like this. {suspicious_detail} doesn't add up."
                    ],
                    realization: [
                        "Wait... {horrifying_discovery}. That changes everything.",
                        "Oh God. {terrible_truth}. We have to get out of here now!",
                        "I think I understand now. {revelation}. It's worse than we thought."
                    ],
                    denial: [
                        "This can't be real. {reality_denial}. It just can't be.",
                        "There has to be a logical explanation. {attempted_explanation}.",
                        "No, no, no. {repetition} This isn't happening."
                    ]
                },
                game_descriptions: {
                    templates: [
                        "Explore {haunted_location} where {threat} lurks in the shadows. {gameplay_mechanic} keeps you constantly on edge.",
                        "Survive the night in {dangerous_place} as {enemy} stalks you. {unique_feature} makes this experience truly terrifying.",
                        "Uncover the dark history of {mystery_location} where {phenomenon} defies explanation. {twist} will challenge your sanity.",
                        "Escape from {cursed_place} before {doom} claims you. {mechanic} ensures no two playthroughs are the same.",
                        "Investigate {disturbing_event} in {location} where {revelation} will change how you see the world."
                    ]
                }
            }
        },
        [THEMES.GORE]: {
            id: THEMES.GORE,
            name: "Gore Horror",
            description: "Extreme violence, visceral horror, body horror",
            icon: "🩸",
            class: "writing-theme-gore",
            writing_rules: {
                message: "WARNING: This theme contains graphic descriptions of violence and bodily harm. Use with caution."
            },
            assets: {
                icons: {
                    themeIcon: "🩸",
                    menuIcon: "🔪",
                    loadingIcon: "💉"
                },
                colors: {
                    primary: "#6b0f1a",
                    "primary-dark": "#4a0404",
                    secondary: "#8b1538",
                    "text-primary": "#ffd1dc",
                    "text-secondary": "#d47a8a",
                    accent: "#ff0000",
                    blood: "rgba(139, 0, 0, 0.7)",
                    flesh: "rgba(255, 204, 188, 0.3)"
                }
            }
        },
        [THEMES.SUPERNATURAL]: {
            id: THEMES.SUPERNATURAL,
            name: "Supernatural Horror",
            description: "Ghosts, hauntings, curses, possession, ancient evils",
            icon: "👻",
            class: "writing-theme-supernatural",
            writing_rules: {
                message: "WARNING: This theme deals with entities that defy natural law. Prolonged exposure may result in narrative contamination."
            },
            assets: {
                icons: {
                    themeIcon: "👻",
                    menuIcon: "🔮",
                    loadingIcon: "🕯️"
                },
                colors: {
                    primary: "#2d1b69",
                    "primary-dark": "#1a0f3a",
                    secondary: "#4a308a",
                    "text-primary": "#e6d7ff",
                    "text-secondary": "#b399d4",
                    accent: "#9d00ff",
                    ethereal: "rgba(157, 0, 255, 0.2)",
                    haunting: "rgba(220, 200, 255, 0.15)"
                }
            }
        },
        [THEMES.POST_APOCALYPTIC]: {
            id: THEMES.POST_APOCALYPTIC,
            name: "Post-Apocalyptic Horror",
            description: "Survival in a ruined world, collapse of civilization",
            icon: "☢️",
            class: "writing-theme-post-apocalyptic",
            writing_rules: {
                message: "WARNING: This theme explores the aftermath of civilization's collapse. The world you knew is gone. What remains may be worse."
            },
            assets: {
                icons: {
                    themeIcon: "☢️",
                    menuIcon: "🏚️",
                    loadingIcon: "⚠️"
                },
                colors: {
                    primary: "#5a4d41",
                    "primary-dark": "#3a2d24",
                    secondary: "#7a6b5e",
                    "text-primary": "#e8d8c0",
                    "text-secondary": "#b8a999",
                    accent: "#d45500",
                    ruin: "rgba(139, 69, 19, 0.3)",
                    toxic: "rgba(143, 188, 143, 0.2)"
                }
            }
        },
        [THEMES.FANTASY]: {
            id: THEMES.FANTASY,
            name: "Fantasy Horror",
            description: "Dark fantasy, cursed magic, ancient curses",
            icon: "🏰",
            class: "writing-theme-fantasy",
            writing_rules: {
                message: "WARNING: This theme explores the dark side of fantasy. Magic has a price, knowledge is dangerous, and power corrupts absolutely."
            },
            assets: {
                icons: {
                    themeIcon: "🏰",
                    menuIcon: "⚔️",
                    loadingIcon: "📜"
                },
                colors: {
                    primary: "#2a1e18",
                    "primary-dark": "#1a0f0a",
                    secondary: "#4a382e",
                    "text-primary": "#e8d8c0",
                    "text-secondary": "#b8a999",
                    accent: "#8b4513",
                    magic: "rgba(139, 69, 19, 0.3)",
                    cursed: "rgba(75, 0, 130, 0.2)"
                }
            }
        },
        [THEMES.SCI_FI]: {
            id: THEMES.SCI_FI,
            name: "Sci-Fi Horror",
            description: "Cosmic horror meets technology, AI gone wrong",
            icon: "🚀",
            class: "writing-theme-sci-fi",
            writing_rules: {
                message: "WARNING: This theme explores the intersection of science and horror. The universe is vast, cold, and indifferent. Technology can be your greatest enemy."
            },
            assets: {
                icons: {
                    themeIcon: "🚀",
                    menuIcon: "🤖",
                    loadingIcon: "🛰️"
                },
                colors: {
                    primary: "#0a1a2a",
                    "primary-dark": "#020c12",
                    secondary: "#1a3a5a",
                    "text-primary": "#c0d8f0",
                    "text-secondary": "#7a9cc6",
                    accent: "#0066cc",
                    technological: "rgba(0, 102, 204, 0.3)",
                    cosmic: "rgba(10, 26, 42, 0.5)"
                }
            }
        },
        [THEMES.PSYCHOLOGICAL]: {
            id: THEMES.PSYCHOLOGICAL,
            name: "Psychological Horror",
            description: "Fear of losing one's mind, gaslighting, reality distortion",
            icon: "🧠",
            class: "writing-theme-psychological",
            writing_rules: {
                message: "WARNING: This theme explores the fragility of the human mind. Reality may not be what it seems."
            },
            assets: {
                icons: {
                    themeIcon: "🧠",
                    menuIcon: "🔍",
                    loadingIcon: "🌀"
                },
                colors: {
                    primary: "#1a1a2a",
                    "primary-dark": "#0a0a12",
                    secondary: "#2a2a4a",
                    "text-primary": "#d0d0f0",
                    "text-secondary": "#9a9ac6",
                    accent: "#6600cc",
                    mind: "rgba(102, 0, 204, 0.2)",
                    reality: "rgba(20, 20, 40, 0.3)"
                }
            }
        },
        [THEMES.COSMIC]: {
            id: THEMES.COSMIC,
            name: "Cosmic Horror",
            description: "Humanity's insignificance, elder gods, incomprehensible entities",
            icon: "🌌",
            class: "writing-theme-cosmic",
            writing_rules: {
                message: "WARNING: This theme explores the terror of the infinite. The universe is vast, cold, and utterly indifferent to humanity."
            },
            assets: {
                icons: {
                    themeIcon: "🌌",
                    menuIcon: "✨",
                    loadingIcon: "🌀"
                },
                colors: {
                    primary: "#0a0a1a",
                    "primary-dark": "#020208",
                    secondary: "#1a1a3a",
                    "text-primary": "#c0c0f0",
                    "text-secondary": "#8a8ac6",
                    accent: "#4400aa",
                    void: "rgba(20, 20, 40, 0.5)",
                    cosmic: "rgba(68, 0, 170, 0.3)"
                }
            }
        }
    };

    // Default theme
    const DEFAULT_THEME = THEMES.HORROR;

    // Storage key
    const STORAGE_KEY = 'sgai_writing_theme';

    // State
    let currentTheme = DEFAULT_THEME;
    let isInitialized = false;
    let themeChangeListeners = [];
    let lexicon = null;
    let themeConfigs = {};

    // Initialize theme configs
    function initializeThemeConfigs() {
        // Load theme configurations from JSON files
        const themeFiles = {
            [THEMES.GORE]: '/core/narrative/themes/gore.json',
            [THEMES.SUPERNATURAL]: '/core/narrative/themes/supernatural.json',
            [THEMES.POST_APOCALYPTIC]: '/core/narrative/themes/post_apocalyptic.json',
            [THEMES.FANTASY]: '/core/narrative/themes/fantasy.json',
            [THEMES.SCI_FI]: '/core/narrative/themes/sci_fi.json',
            [THEMES.COSMIC]: '/core/narrative/themes/cosmic_horror.json',
            [THEMES.PSYCHOLOGICAL]: '/core/narrative/themes/psychological_horror.json',
            // Expanded themes for Phase 1
            [THEMES.BODY_HORROR]: '/core/narrative/themes/body_horror.json',
            [THEMES.FOLK_HORROR]: '/core/narrative/themes/folk_horror.json',
            [THEMES.LOVECRAFTIAN]: '/core/narrative/themes/lovecraftian.json',
            [THEMES.TECHNOLOGICAL]: '/core/narrative/themes/technological.json',
            [THEMES.URBAN_LEGEND]: '/core/narrative/themes/urban_legend.json',
            [THEMES.FOUND_FOOTAGE]: '/core/narrative/themes/found_footage.json',
            [THEMES.APOCALYPTIC]: '/core/narrative/themes/apocalyptic.json'
        };

        // Merge built-in configs with external configs
        Object.keys(THEME_CONFIGS).forEach(themeId => {
            themeConfigs[themeId] = {...THEME_CONFIGS[themeId]};
        });

        // Load external theme configs
        const loadPromises = Object.entries(themeFiles).map(([themeId, path]) => {
            return fetch(path)
                .then(response => {
                    if (!response.ok) {
                        console.warn(`Failed to load theme config for ${themeId}: ${response.status}`);
                        return null;
                    }
                    return response.json();
                })
                .then(config => {
                    if (config) {
                        themeConfigs[themeId] = {...themeConfigs[themeId], ...config};
                    }
                })
                .catch(error => {
                    console.error(`Error loading theme config for ${themeId}:`, error);
                });
        });

        return Promise.all(loadPromises);
    }

    // Load lexicon
    function loadLexicon() {
        return fetch('/data/lore/horror_lexicon.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load lexicon: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                lexicon = data;
                return data;
            })
            .catch(error => {
                console.error('Error loading lexicon:', error);
                // Fallback to minimal lexicon
                lexicon = {
                    vocabulary: {
                        nouns_by_theme: {},
                        verbs_by_terror: {},
                        adjectives: {}
                    },
                    themes: {
                        horror_types: {}
                    }
                };
                return lexicon;
            });
    }

    // Initialize the manager
    async function init() {
        try {
            // Load theme configurations
            await initializeThemeConfigs();

            // Load lexicon
            await loadLexicon();

            // Load saved theme
            loadTheme();

            // Apply theme
            applyTheme(currentTheme);

            isInitialized = true;

            // Notify listeners
            notifyThemeChange(currentTheme, getCurrentThemeConfig());

            console.log('ThemeWritingManager initialized with theme:', currentTheme);
        } catch (error) {
            console.error('Error initializing ThemeWritingManager:', error);
            // Fallback to default theme
            currentTheme = DEFAULT_THEME;
            applyTheme(currentTheme);
            isInitialized = true;
        }
    }

    // Load saved theme
    function loadTheme() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && THEMES[saved.toUpperCase()]) {
                currentTheme = saved;
            }
        } catch (e) {
            console.warn('Could not access localStorage:', e);
        }
    }

    // Save current theme
    function saveTheme() {
        try {
            localStorage.setItem(STORAGE_KEY, currentTheme);
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }
    }

    // Apply theme to the UI
    function applyTheme(themeId) {
        const config = getThemeConfig(themeId);
        if (!config) return;

        // Apply theme class to document
        document.documentElement.classList.remove(...Object.values(THEMES).map(t => `writing-theme-${t}`));
        document.documentElement.classList.add(config.class);

        // Apply theme colors
        if (config.assets && config.assets.colors) {
            const root = document.documentElement;
            Object.entries(config.assets.colors).forEach(([key, value]) => {
                root.style.setProperty(`--writing-theme-${key}`, value);
            });
        }

        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('writing-theme-change', {
            detail: { theme: themeId, config }
        }));
    }

    // Set theme
    async function setTheme(themeId) {
        if (!THEMES[themeId.toUpperCase()]) {
            console.error('Invalid theme:', themeId);
            return false;
        }

        if (themeId === currentTheme) {
            return true;
        }

        // Apply the new theme
        applyTheme(themeId);
        currentTheme = themeId;
        saveTheme();

        // Notify listeners
        notifyThemeChange(themeId, getCurrentThemeConfig());

        return true;
    }

    // Get current theme
    function getCurrentTheme() {
        return currentTheme;
    }

    // Get current theme config
    function getCurrentThemeConfig() {
        return getThemeConfig(currentTheme);
    }

    // Get theme config
    function getThemeConfig(themeId) {
        return themeConfigs[themeId] || themeConfigs[DEFAULT_THEME];
    }

    // Get all available themes
    function getAvailableThemes() {
        return Object.values(THEMES).map(themeId => ({
            id: themeId,
            ...getThemeConfig(themeId)
        }));
    }

    // Add theme change listener
    function addThemeChangeListener(listener) {
        if (typeof listener === 'function') {
            themeChangeListeners.push(listener);
        }
    }

    // Remove theme change listener
    function removeThemeChangeListener(listener) {
        themeChangeListeners = themeChangeListeners.filter(l => l !== listener);
    }

    // Notify theme change listeners
    function notifyThemeChange(themeId, themeConfig) {
        themeChangeListeners.forEach(listener => {
            try {
                listener(themeId, themeConfig);
            } catch (error) {
                console.error('Error in theme change listener:', error);
            }
        });
    }

    // Generate content based on theme
    function generateContent(type, options = {}) {
        const themeConfig = getCurrentThemeConfig();
        const themeId = getCurrentTheme();

        if (!themeConfig || !themeConfig.content) {
            return getFallbackContent(type, options);
        }

        // Get content templates for the type
        const templates = themeConfig.content[type];
        if (!templates) {
            return getFallbackContent(type, options);
        }

        // Select a random template
        const template = selectRandomTemplate(templates);
        if (!template) {
            return getFallbackContent(type, options);
        }

        // Replace placeholders in the template
        return replacePlaceholders(template, themeId, options);
    }

    // Select a random template
    function selectRandomTemplate(templates) {
        if (Array.isArray(templates)) {
            return templates[Math.floor(Math.random() * templates.length)];
        } else if (typeof templates === 'object') {
            const keys = Object.keys(templates);
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            return templates[randomKey];
        }
        return null;
    }

    // Replace placeholders in template
    function replacePlaceholders(template, themeId, options) {
        if (!template) return '';

        // Get lexicon for the current theme
        const themeLexicon = getThemeLexicon(themeId);

        // Replace simple placeholders
        let result = template.replace(/\{(\w+)\}/g, (match, placeholder) => {
            return getPlaceholderValue(placeholder, themeLexicon, options) || match;
        });

        // Replace placeholders with alternatives (e.g., {action|reaction})
        result = result.replace(/\{(\w+)\|(\w+)\}/g, (match, opt1, opt2) => {
            return Math.random() < 0.5 ? opt1 : opt2;
        });

        // Replace nested placeholders
        result = result.replace(/\{(\w+)\.(\w+)\}/g, (match, category, subcategory) => {
            return getNestedPlaceholderValue(category, subcategory, themeLexicon) || match;
        });

        return result;
    }

    // Get placeholder value
    function getPlaceholderValue(placeholder, themeLexicon, options) {
        // Check options first
        if (options && options[placeholder] !== undefined) {
            return options[placeholder];
        }

        // Check theme-specific content
        const themeConfig = getCurrentThemeConfig();
        if (themeConfig.content && themeConfig.content[placeholder]) {
            const values = themeConfig.content[placeholder];
            if (Array.isArray(values)) {
                return values[Math.floor(Math.random() * values.length)];
            }
            return values;
        }

        // Check lexicon
        if (lexicon && lexicon.vocabulary) {
            // Check nouns
            if (lexicon.vocabulary.nouns_by_theme && lexicon.vocabulary.nouns_by_theme[placeholder]) {
                const nouns = lexicon.vocabulary.nouns_by_theme[placeholder];
                return nouns[Math.floor(Math.random() * nouns.length)];
            }

            // Check verbs
            if (lexicon.vocabulary.verbs_by_terror && lexicon.vocabulary.verbs_by_terror[placeholder]) {
                const verbs = lexicon.vocabulary.verbs_by_terror[placeholder];
                return verbs[Math.floor(Math.random() * verbs.length)];
            }

            // Check adjectives
            if (lexicon.vocabulary.adjectives && lexicon.vocabulary.adjectives[placeholder]) {
                const adjectives = lexicon.vocabulary.adjectives[placeholder];
                if (Array.isArray(adjectives)) {
                    return adjectives[Math.floor(Math.random() * adjectives.length)];
                }
                return adjectives;
            }
        }

        // Check theme lexicon
        if (themeLexicon && themeLexicon[placeholder]) {
            const values = themeLexicon[placeholder];
            if (Array.isArray(values)) {
                return values[Math.floor(Math.random() * values.length)];
            }
            return values;
        }

        return null;
    }

    // Get nested placeholder value
    function getNestedPlaceholderValue(category, subcategory, themeLexicon) {
        if (lexicon && lexicon.vocabulary) {
            if (lexicon.vocabulary[category] && lexicon.vocabulary[category][subcategory]) {
                const values = lexicon.vocabulary[category][subcategory];
                return values[Math.floor(Math.random() * values.length)];
            }
        }

        if (themeLexicon && themeLexicon[category] && themeLexicon[category][subcategory]) {
            const values = themeLexicon[category][subcategory];
            return values[Math.floor(Math.random() * values.length)];
        }

        return null;
    }

    // Get theme-specific lexicon
    function getThemeLexicon(themeId) {
        if (!lexicon || !lexicon.themes || !lexicon.themes.horror_types) {
            return {};
        }

        const themeType = getThemeType(themeId);
        const themeData = lexicon.themes.horror_types[themeType];

        if (!themeData || !themeData.vocabulary_subsets) {
            return {};
        }

        const lexiconData = {};

        // Build theme-specific lexicon
        themeData.vocabulary_subsets.forEach(subset => {
            const [category, subcategory] = subset.split('.');
            if (lexicon.vocabulary[category] && lexicon.vocabulary[category][subcategory]) {
                lexiconData[subcategory] = lexicon.vocabulary[category][subcategory];
            }
        });

        return lexiconData;
    }

    // Get theme type from theme ID
    function getThemeType(themeId) {
        const themeMap = {
            [THEMES.GORE]: 'gore',
            [THEMES.SUPERNATURAL]: 'supernatural',
            [THEMES.POST_APOCALYPTIC]: 'post_apocalyptic',
            [THEMES.FANTASY]: 'fantasy',
            [THEMES.SCI_FI]: 'sci_fi',
            [THEMES.PSYCHOLOGICAL]: 'psychological_horror',
            [THEMES.COSMIC]: 'cosmic_horror',
            [THEMES.HORROR]: 'haunting_horror',
            [THEMES.DEFAULT]: 'haunting_horror',
            // Expanded themes for Phase 1
            [THEMES.BODY_HORROR]: 'body_horror',
            [THEMES.FOLK_HORROR]: 'folk_horror',
            [THEMES.LOVECRAFTIAN]: 'lovecraftian',
            [THEMES.TECHNOLOGICAL]: 'technological',
            [THEMES.URBAN_LEGEND]: 'urban_legend',
            [THEMES.FOUND_FOOTAGE]: 'found_footage',
            [THEMES.APOCALYPTIC]: 'apocalyptic'
        };

        return themeMap[themeId] || 'haunting_horror';
    }

    // Get fallback content
    function getFallbackContent(type, options) {
        const fallbacks = {
            greeting: "The {location} feels {adjective}. {Observation} suggests {implication}.",
            farewell: "{Warning} lingers. {Action_advice} before {consequence}.",
            loading: "{Process} {status}... {Warning_message}.",
            narrative: "{Character} {action} in {location}. {Event} occurs, leading to {outcome}.",
            description: "The {location} appears {adjective}, though {uncertainty} lingers."
        };

        const template = fallbacks[type] || fallbacks.narrative;
        return replacePlaceholders(template, DEFAULT_THEME, options);
    }

    // Generate environmental description
    function generateEnvironmentalDescription(location, options = {}) {
        const themeId = getCurrentTheme();
        const themeConfig = getCurrentThemeConfig();

        // Use theme-specific location templates if available
        if (themeConfig.content && themeConfig.content.location_descriptions) {
            const locationTemplates = themeConfig.content.location_descriptions[location];
            if (locationTemplates && locationTemplates.length > 0) {
                const template = locationTemplates[Math.floor(Math.random() * locationTemplates.length)];
                return replacePlaceholders(template, themeId, options);
            }
        }

        // Use generic location template
        if (themeConfig.content && themeConfig.content.location_descriptions &&
            themeConfig.content.location_descriptions.generic_location) {
            const genericTemplates = themeConfig.content.location_descriptions.generic_location;
            const template = genericTemplates[Math.floor(Math.random() * genericTemplates.length)];
            return replacePlaceholders(template, themeId, {...options, location});
        }

        // Fallback to generic description
        return getFallbackContent('description', {...options, location});
    }

    // Generate character dialogue
    function generateCharacterDialogue(characterType, dialogType, options = {}) {
        const themeId = getCurrentTheme();
        const themeConfig = getCurrentThemeConfig();

        // Use theme-specific character dialog if available
        if (themeConfig.content && themeConfig.content.character_dialog &&
            themeConfig.content.character_dialog[dialogType]) {
            const dialogTemplates = themeConfig.content.character_dialog[dialogType];
            const template = selectRandomTemplate(dialogTemplates);
            return replacePlaceholders(template, themeId, {...options, characterType});
        }

        // Use lexicon character dialog patterns
        if (lexicon && lexicon.phraseology && lexicon.phraseology.character_dialog) {
            const dialogPatterns = lexicon.phraseology.character_dialog.templates[dialogType];
            if (dialogPatterns) {
                const template = selectRandomTemplate(dialogPatterns);
                return replacePlaceholders(template, themeId, options);
            }
        }

        // Fallback to generic dialog
        const fallbacks = {
            reassurance: "It's probably just {innocuous_explanation}.",
            doubt: "Something's not right. {observation}.",
            realization: "Wait... {horrifying_discovery}.",
            denial: "This can't be happening. {reality_denial}."
        };

        const template = fallbacks[dialogType] || fallbacks.reassurance;
        return replacePlaceholders(template, themeId, options);
    }

    // Generate game description
    function generateGameDescription(options = {}) {
        const themeId = getCurrentTheme();
        const themeConfig = getCurrentThemeConfig();

        if (themeConfig.content && themeConfig.content.game_descriptions) {
            const templates = themeConfig.content.game_descriptions.templates;
            if (templates && templates.length > 0) {
                const template = templates[Math.floor(Math.random() * templates.length)];
                return replacePlaceholders(template, themeId, {
                    ...themeConfig.content.game_descriptions,
                    ...options
                });
            }
        }

        return getFallbackContent('narrative', options);
    }

    // Generate theme-specific content
    function generateThemeSpecificContent(contentType, options = {}) {
        const themeId = getCurrentTheme();
        const themeConfig = getCurrentThemeConfig();

        if (themeConfig.content && themeConfig.content[contentType]) {
            const templates = themeConfig.content[contentType];
            const template = selectRandomTemplate(templates);
            return replacePlaceholders(template, themeId, options);
        }

        return getFallbackContent(contentType, options);
    }

    // Generate interactive content
    function generateInteractiveContent(contentType, options = {}) {
        const themeId = getCurrentTheme();
        const themeConfig = getCurrentThemeConfig();

        if (lexicon && lexicon.atmosphere_templates && lexicon.atmosphere_templates.interactive) {
            const interactiveTemplates = lexicon.atmosphere_templates.interactive.discoverable[contentType];
            if (interactiveTemplates) {
                let content = interactiveTemplates.header + "\n";

                if (interactiveTemplates.content) {
                    const contentTemplate = replacePlaceholders(
                        interactiveTemplates.content,
                        themeId,
                        options
                    );
                    content += contentTemplate;
                }

                return content;
            }
        }

        return getFallbackContent(contentType, options);
    }

    // Apply writing rules to text
    function applyWritingRules(text, options = {}) {
        const themeId = getCurrentTheme();
        const themeConfig = getCurrentThemeConfig();
        const themeType = getThemeType(themeId);

        if (!themeConfig.writing_rules || !lexicon) {
            return text;
        }

        // Apply theme-specific sentence structure rules
        if (themeConfig.writing_rules.sentence_structure) {
            text = applySentenceStructureRules(text, themeConfig.writing_rules.sentence_structure);
        }

        // Apply theme-specific content constraints
        if (lexicon.content_constraints && lexicon.content_constraints.theme_specific &&
            lexicon.content_constraints.theme_specific[themeType]) {
            const constraints = lexicon.content_constraints.theme_specific[themeType];
            if (constraints && Math.random() < (constraints.probability || 0.7)) {
                const constraintTemplates = constraints.templates;
                if (constraintTemplates && constraintTemplates.length > 0) {
                    const template = constraintTemplates[Math.floor(Math.random() * constraintTemplates.length)];
                    const constraintText = replacePlaceholders(template, themeId, options);
                    text += " " + constraintText;
                }
            }
        }

        return text;
    }

    // Apply sentence structure rules
    function applySentenceStructureRules(text, rules) {
        // This is a simplified implementation
        // In a full implementation, this would analyze and modify sentence structure

        // Apply fragment probability
        if (rules.fragment_probability && Math.random() < rules.fragment_probability) {
            // Convert some sentences to fragments
            const sentences = text.split(/[.!?]+/);
            if (sentences.length > 1) {
                const fragmentIndex = Math.floor(Math.random() * sentences.length);
                sentences[fragmentIndex] = sentences[fragmentIndex].trim() + "...";
                text = sentences.join(' ');
            }
        }

        // Apply ellipsis probability
        if (rules.ellipsis_probability && Math.random() < rules.ellipsis_probability) {
            // Add ellipsis to some sentences
            const sentences = text.split(/[.!?]+/);
            if (sentences.length > 0) {
                const ellipsisIndex = Math.floor(Math.random() * sentences.length);
                sentences[ellipsisIndex] = sentences[ellipsisIndex].trim() + "...";
                text = sentences.join(' ');
            }
        }

        return text;
    }

    // Get theme assets
    function getThemeAssets(themeId) {
        const config = getThemeConfig(themeId);
        return config.assets || {};
    }

    // Get theme writing rules
    function getThemeWritingRules(themeId) {
        const config = getThemeConfig(themeId);
        return config.writing_rules || {};
    }

    // Check if initialized
    function isManagerInitialized() {
        return isInitialized;
    }

    // Expose public API
    window.ThemeWritingManager = {
        init,
        setTheme,
        getCurrentTheme,
        getCurrentThemeConfig,
        getThemeConfig,
        getAvailableThemes,
        addThemeChangeListener,
        removeThemeChangeListener,
        generateContent,
        generateEnvironmentalDescription,
        generateCharacterDialogue,
        generateGameDescription,
        generateThemeSpecificContent,
        generateInteractiveContent,
        applyWritingRules,
        getThemeAssets,
        getThemeWritingRules,
        isInitialized: () => isInitialized,
        THEMES
    };

    // Auto-init if DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();