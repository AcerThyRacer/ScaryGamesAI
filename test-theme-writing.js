/**
 * Test Theme Writing System - Phase 1 Verification
 *
 * This test file verifies the implementation of the 7 core horror writing themes
 * and the ThemeWritingManager functionality.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock DOM environment for testing
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};

// Load the ThemeWritingManager
const themeManagerCode = fs.readFileSync(path.join(__dirname, '../js/theme-writing-manager.js'), 'utf8');
eval(themeManagerCode);

// Mock fetch for theme configurations
global.fetch = async (url) => {
    const themeFiles = {
        '/core/narrative/themes/gore.json': '/core/narrative/themes/gore.json',
        '/core/narrative/themes/supernatural.json': '/core/narrative/themes/supernatural.json',
        '/core/narrative/themes/post_apocalyptic.json': '/core/narrative/themes/post_apocalyptic.json',
        '/core/narrative/themes/fantasy.json': '/core/narrative/themes/fantasy.json',
        '/core/narrative/themes/sci_fi.json': '/core/narrative/themes/sci_fi.json',
        '/data/lore/horror_lexicon.json': '/data/lore/horror_lexicon.json'
    };

    if (themeFiles[url]) {
        try {
            const filePath = path.join(__dirname, '..', url);
            const data = fs.readFileSync(filePath, 'utf8');
            return {
                ok: true,
                json: async () => JSON.parse(data)
            };
        } catch (error) {
            console.error(`Error reading mock file ${url}:`, error);
            return {
                ok: false,
                status: 404
            };
        }
    }

    return {
        ok: false,
        status: 404
    };
};

describe('ThemeWritingManager - Phase 1 Implementation', function() {
    this.timeout(10000);

    before(async () => {
        // Initialize the theme manager
        await window.ThemeWritingManager.init();
    });

    describe('Initialization', () => {
        it('should initialize successfully', () => {
            assert.strictEqual(window.ThemeWritingManager.isInitialized(), true);
        });

        it('should have default theme set', () => {
            assert.strictEqual(window.ThemeWritingManager.getCurrentTheme(), 'horror');
        });
    });

    describe('Theme Management', () => {
        it('should return all available themes', () => {
            const themes = window.ThemeWritingManager.getAvailableThemes();
            assert.ok(Array.isArray(themes));
            assert.ok(themes.length >= 7); // Should have at least 7 core themes

            const themeIds = themes.map(t => t.id);
            assert.ok(themeIds.includes('gore'));
            assert.ok(themeIds.includes('supernatural'));
            assert.ok(themeIds.includes('post_apocalyptic'));
            assert.ok(themeIds.includes('fantasy'));
            assert.ok(themeIds.includes('sci_fi'));
            assert.ok(themeIds.includes('psychological'));
            assert.ok(themeIds.includes('cosmic'));
        });

        it('should switch themes successfully', async () => {
            const result = await window.ThemeWritingManager.setTheme('gore');
            assert.strictEqual(result, true);
            assert.strictEqual(window.ThemeWritingManager.getCurrentTheme(), 'gore');

            // Test another theme
            await window.ThemeWritingManager.setTheme('supernatural');
            assert.strictEqual(window.ThemeWritingManager.getCurrentTheme(), 'supernatural');
        });

        it('should return theme configurations', () => {
            const goreConfig = window.ThemeWritingManager.getThemeConfig('gore');
            assert.ok(goreConfig);
            assert.strictEqual(goreConfig.id, 'gore');
            assert.strictEqual(goreConfig.name, 'Gore Horror');
            assert.ok(goreConfig.writing_rules);
            assert.ok(goreConfig.assets);

            const supernaturalConfig = window.ThemeWritingManager.getThemeConfig('supernatural');
            assert.ok(supernaturalConfig);
            assert.strictEqual(supernaturalConfig.id, 'supernatural');
            assert.strictEqual(supernaturalConfig.name, 'Supernatural Horror');
        });
    });

    describe('Content Generation', () => {
        it('should generate greetings for each theme', () => {
            const themes = ['gore', 'supernatural', 'post_apocalyptic', 'fantasy', 'sci_fi', 'psychological', 'cosmic'];

            for (const theme of themes) {
                window.ThemeWritingManager.setTheme(theme);
                const greeting = window.ThemeWritingManager.generateContent('greetings');
                assert.ok(greeting);
                assert.ok(typeof greeting === 'string');
                assert.ok(greeting.length > 0);
                console.log(`[${theme}] Greeting: ${greeting}`);
            }
        });

        it('should generate farewells for each theme', () => {
            const themes = ['gore', 'supernatural', 'post_apocalyptic', 'fantasy', 'sci_fi', 'psychological', 'cosmic'];

            for (const theme of themes) {
                window.ThemeWritingManager.setTheme(theme);
                const farewell = window.ThemeWritingManager.generateContent('farewells');
                assert.ok(farewell);
                assert.ok(typeof farewell === 'string');
                assert.ok(farewell.length > 0);
                console.log(`[${theme}] Farewell: ${farewell}`);
            }
        });

        it('should generate game descriptions for each theme', () => {
            const themes = ['gore', 'supernatural', 'post_apocalyptic', 'fantasy', 'sci_fi', 'psychological', 'cosmic'];

            for (const theme of themes) {
                window.ThemeWritingManager.setTheme(theme);
                const description = window.ThemeWritingManager.generateGameDescription();
                assert.ok(description);
                assert.ok(typeof description === 'string');
                assert.ok(description.length > 0);
                console.log(`[${theme}] Game Description: ${description}`);
            }
        });

        it('should generate environmental descriptions', () => {
            const locations = ['abandoned_hospital', 'ruined_city', 'cursed_castle', 'derelict_spaceship'];

            for (const location of locations) {
                const description = window.ThemeWritingManager.generateEnvironmentalDescription(location);
                assert.ok(description);
                assert.ok(typeof description === 'string');
                assert.ok(description.length > 0);
                console.log(`[${location}] Description: ${description}`);
            }
        });

        it('should generate character dialogue', () => {
            const dialogTypes = ['reassurance', 'doubt', 'realization', 'denial'];

            for (const dialogType of dialogTypes) {
                const dialogue = window.ThemeWritingManager.generateCharacterDialogue('The Historian', dialogType);
                assert.ok(dialogue);
                assert.ok(typeof dialogue === 'string');
                assert.ok(dialogue.length > 0);
                console.log(`[${dialogType}] Dialogue: ${dialogue}`);
            }
        });

        it('should generate theme-specific content', () => {
            window.ThemeWritingManager.setTheme('gore');
            const injuryReport = window.ThemeWritingManager.generateThemeSpecificContent('injury_reports');
            assert.ok(injuryReport);
            assert.ok(typeof injuryReport === 'string');
            assert.ok(injuryReport.length > 0);
            console.log('[Gore] Injury Report:', injuryReport);

            window.ThemeWritingManager.setTheme('supernatural');
            const hauntingReport = window.ThemeWritingManager.generateThemeSpecificContent('haunting_reports');
            assert.ok(hauntingReport);
            assert.ok(typeof hauntingReport === 'string');
            assert.ok(hauntingReport.length > 0);
            console.log('[Supernatural] Haunting Report:', hauntingReport);
        });

        it('should generate interactive content', () => {
            const contentTypes = ['medical_record', 'audio_log', 'character_note'];

            for (const contentType of contentTypes) {
                const content = window.ThemeWritingManager.generateInteractiveContent(contentType, {
                    name: 'Test Subject',
                    condition: 'unknown',
                    observation: 'exhibiting unusual symptoms'
                });
                assert.ok(content);
                assert.ok(typeof content === 'string');
                assert.ok(content.length > 0);
                console.log(`[${contentType}] Content:`, content);
            }
        });
    });

    describe('Writing Rules', () => {
        it('should apply writing rules to text', () => {
            window.ThemeWritingManager.setTheme('gore');
            const originalText = "The wound was severe. Blood pooled on the floor.";
            const processedText = window.ThemeWritingManager.applyWritingRules(originalText);

            assert.ok(processedText);
            assert.ok(typeof processedText === 'string');
            console.log('Original:', originalText);
            console.log('Processed:', processedText);
        });

        it('should return theme writing rules', () => {
            const goreRules = window.ThemeWritingManager.getThemeWritingRules('gore');
            assert.ok(goreRules);
            assert.ok(goreRules.message);
            assert.ok(goreRules.message.includes('WARNING'));

            const supernaturalRules = window.ThemeWritingManager.getThemeWritingRules('supernatural');
            assert.ok(supernaturalRules);
            assert.ok(supernaturalRules.message);
            assert.ok(supernaturalRules.message.includes('WARNING'));
        });
    });

    describe('Theme Assets', () => {
        it('should return theme assets', () => {
            const goreAssets = window.ThemeWritingManager.getThemeAssets('gore');
            assert.ok(goreAssets);
            assert.ok(goreAssets.icons);
            assert.ok(goreAssets.colors);

            const supernaturalAssets = window.ThemeWritingManager.getThemeAssets('supernatural');
            assert.ok(supernaturalAssets);
            assert.ok(supernaturalAssets.icons);
            assert.ok(supernaturalAssets.colors);
        });
    });

    describe('Theme Change Listeners', () => {
        it('should add and remove theme change listeners', () => {
            let listenerCalled = false;
            const testListener = (themeId, themeConfig) => {
                listenerCalled = true;
                assert.ok(themeId);
                assert.ok(themeConfig);
            };

            window.ThemeWritingManager.addThemeChangeListener(testListener);
            window.ThemeWritingManager.setTheme('gore');
            assert.ok(listenerCalled);

            listenerCalled = false;
            window.ThemeWritingManager.removeThemeChangeListener(testListener);
            window.ThemeWritingManager.setTheme('supernatural');
            assert.strictEqual(listenerCalled, false);
        });
    });

    describe('Comprehensive Theme Testing', () => {
        const themes = [
            { id: 'gore', name: 'Gore Horror' },
            { id: 'supernatural', name: 'Supernatural Horror' },
            { id: 'post_apocalyptic', name: 'Post-Apocalyptic Horror' },
            { id: 'fantasy', name: 'Fantasy Horror' },
            { id: 'sci_fi', name: 'Sci-Fi Horror' },
            { id: 'psychological', name: 'Psychological Horror' },
            { id: 'cosmic', name: 'Cosmic Horror' }
        ];

        for (const theme of themes) {
            it(`should fully implement ${theme.name} theme`, async () => {
                await window.ThemeWritingManager.setTheme(theme.id);

                // Test theme config
                const config = window.ThemeWritingManager.getCurrentThemeConfig();
                assert.strictEqual(config.id, theme.id);
                assert.strictEqual(config.name, theme.name);
                assert.ok(config.description);
                assert.ok(config.writing_rules);
                assert.ok(config.assets);

                // Test content generation
                const greeting = window.ThemeWritingManager.generateContent('greetings');
                assert.ok(greeting);
                assert.ok(greeting.length > 0);

                const farewell = window.ThemeWritingManager.generateContent('farewells');
                assert.ok(farewell);
                assert.ok(farewell.length > 0);

                const gameDesc = window.ThemeWritingManager.generateGameDescription();
                assert.ok(gameDesc);
                assert.ok(gameDesc.length > 0);

                // Test theme-specific content
                const themeContent = window.ThemeWritingManager.generateThemeSpecificContent('game_descriptions');
                assert.ok(themeContent);
                assert.ok(themeContent.length > 0);

                console.log(`✓ ${theme.name} theme implementation verified`);
            });
        }
    });

    describe('Error Handling', () => {
        it('should handle invalid theme gracefully', async () => {
            const result = await window.ThemeWritingManager.setTheme('invalid_theme');
            assert.strictEqual(result, false);
            assert.notStrictEqual(window.ThemeWritingManager.getCurrentTheme(), 'invalid_theme');
        });

        it('should return fallback content for unknown content types', () => {
            const content = window.ThemeWritingManager.generateContent('nonexistent_type');
            assert.ok(content);
            assert.ok(typeof content === 'string');
            assert.ok(content.length > 0);
        });
    });
});

/**
 * Test Summary
 *
 * This test suite verifies the complete implementation of Phase 1 of the
 * Creative Writing Roadmap, specifically:
 *
 * ✅ 7 core horror writing themes implemented
 * ✅ ThemeWritingManager functionality
 * ✅ Theme switching and persistence
 * ✅ Content generation for all themes
 * ✅ Environmental storytelling
 * ✅ Character dialogue generation
 * ✅ Game description generation
 * ✅ Interactive content generation
 * ✅ Writing rules application
 * ✅ Theme assets management
 * ✅ Error handling and fallbacks
 *
 * All tests should pass to confirm Phase 1 completion.
 */