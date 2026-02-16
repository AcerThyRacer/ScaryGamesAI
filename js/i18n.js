/* ============================================
   ScaryGamesAI — Localization System (i18n)
   Multi-language support with browser detection
   ============================================ */

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════

    const STORAGE_KEY = 'sgai_language';
    
    const SUPPORTED_LANGUAGES = {
        en: { name: 'English', flag: '🇺🇸', native: 'English' },
        es: { name: 'Spanish', flag: '🇪🇸', native: 'Español' },
        de: { name: 'German', flag: '🇩🇪', native: 'Deutsch' },
        fr: { name: 'French', flag: '🇫🇷', native: 'Français' },
        pt: { name: 'Portuguese', flag: '🇧🇷', native: 'Português' },
        ja: { name: 'Japanese', flag: '🇯🇵', native: '日本語' },
        zh: { name: 'Chinese', flag: '🇨🇳', native: '中文' },
        ko: { name: 'Korean', flag: '🇰🇷', native: '한국어' },
        ru: { name: 'Russian', flag: '🇷🇺', native: 'Русский' },
        pl: { name: 'Polish', flag: '🇵🇱', native: 'Polski' },
    };

    let currentLanguage = 'en';
    let translations = {};

    // ═══════════════════════════════════════════════════════════════
    // TRANSLATIONS DATABASE
    // ═══════════════════════════════════════════════════════════════

    const TRANSLATIONS = {
        en: {
            // Navigation
            'nav.home': 'Home',
            'nav.games': 'Games',
            'nav.challenges': 'Challenges',
            'nav.achievements': 'Achievements',
            'nav.leaderboards': 'Leaderboards',
            'nav.subscribe': 'Subscribe',
            'nav.store': 'Store',
            'nav.about': 'About',

            // Hero Section
            'hero.title': 'ScaryGames',
            'hero.subtitle': 'Enter The Darkness',
            'hero.description': 'Experience terrifying browser-based horror games. Navigate haunted backrooms, crawl through shadow-filled dungeons, and survive your worst nightmares — all from your browser.',
            'hero.playNow': 'Play Now',
            'hero.playingNow': 'playing now',

            // Stats
            'stats.gamesPlayed': 'Games Played',
            'stats.activePlayers': 'Active Players',
            'stats.scaresDelivered': 'Scares Delivered',
            'stats.hoursSurvived': 'Hours Survived',

            // Sections
            'section.featured': 'Featured Game',
            'section.featuredDesc': 'Our most terrifying experience yet',
            'section.spotlight': 'Spotlight',
            'section.spotlightDesc': "This week's most terrifying picks",
            'section.howItWorks': 'How It Works',
            'section.howItWorksDesc': 'Three steps to terror',
            'section.allGames': 'All Games',
            'section.allGamesDesc': 'Choose your nightmare',
            'section.scareMeter': 'Scare-O-Meter',
            'section.scareMeterDesc': 'Global terror intensity — LIVE',
            'section.community': 'Community Terror Wall',
            'section.communityDesc': 'What survivors are saying',
            'section.dailyChallenge': 'Daily Challenge',
            'section.dailyChallengeDesc': 'A new dare every day',
            'section.newsletter': 'Join The Darkness',
            'section.newsletterDesc': 'Get notified about new games, events, and exclusive content. No spam — only scares.',
            'section.about': 'About',
            'section.aboutDesc': 'What lurks in the dark?',

            // How It Works
            'hiw.step1.title': 'Choose Your Fear',
            'hiw.step1.desc': 'Browse our collection of terrifying games. From psychological horror to survival terror — pick your nightmare.',
            'hiw.step2.title': 'Play Instantly',
            'hiw.step2.desc': "No downloads, no installs. Click play and you're in. Our games run directly in your browser at full quality.",
            'hiw.step3.title': 'Survive... If You Can',
            'hiw.step3.desc': 'Face your fears, complete challenges, climb leaderboards, and unlock achievements. How long will you last?',

            // Scare Meter
            'scare.calm': 'Calm',
            'scare.uneasy': 'Uneasy',
            'scare.terrified': 'Terrified',
            'scare.maximum': 'MAXIMUM',

            // Game Cards
            'game.play': 'Play',
            'game.new': 'NEW',
            'game.popular': 'Popular',
            'game.requiredTier': 'Required tier',
            'game.difficulty': 'Difficulty',

            // Subscription Tiers
            'tier.free': 'Free',
            'tier.survivor': 'Survivor',
            'tier.hunter': 'Hunter',
            'tier.elderGod': 'Elder God',
            'tier.perMonth': '/month',

            // Store
            'store.title': 'Store',
            'store.heroTitle': 'Claim relic-tier cosmetics forged for nightmares.',
            'store.heroDesc': 'Unlock elite skins, violent effects, and prestige bundles that reshape every run across the ScaryGamesAI universe.',
            'store.bundles': 'Bundles',
            'store.skins': 'Skins',
            'store.effects': 'Effects',
            'store.battlePass': 'Battle Pass',
            'store.currency': 'Currency',
            'store.gems': 'Gems',
            'store.souls': 'Souls',

            // Leaderboards
            'leaderboard.title': 'Leaderboards',
            'leaderboard.rank': 'Rank',
            'leaderboard.player': 'Player',
            'leaderboard.score': 'Score',
            'leaderboard.time': 'Time',
            'leaderboard.daily': 'Daily',
            'leaderboard.weekly': 'Weekly',
            'leaderboard.allTime': 'All Time',

            // Achievements
            'achievements.title': 'Achievements',
            'achievements.unlocked': 'Unlocked',
            'achievements.locked': 'Locked',
            'achievements.progress': 'Progress',

            // Challenges
            'challenges.title': 'Challenges',
            'challenges.daily': 'Daily Challenge',
            'challenges.weekly': 'Weekly Challenge',
            'challenges.completed': 'Completed',
            'challenges.expiresIn': 'Expires in',
            'challenges.claimReward': 'Claim Reward',

            // Profile
            'profile.title': 'Profile',
            'profile.edit': 'Edit Profile',
            'profile.stats': 'Statistics',
            'profile.gamesPlayed': 'Games Played',
            'profile.totalTime': 'Total Time',
            'profile.highScores': 'High Scores',
            'profile.achievements': 'Achievements',

            // Settings
            'settings.title': 'Settings',
            'settings.audio': 'Audio',
            'settings.graphics': 'Graphics',
            'settings.controls': 'Controls',
            'settings.accessibility': 'Accessibility',
            'settings.gameplay': 'Gameplay',
            'settings.language': 'Language',

            // Audio Settings
            'audio.masterVolume': 'Master Volume',
            'audio.musicVolume': 'Music Volume',
            'audio.sfxVolume': 'SFX Volume',
            'audio.muted': 'Muted',

            // Common
            'common.loading': 'Loading...',
            'common.error': 'Error',
            'common.retry': 'Retry',
            'common.cancel': 'Cancel',
            'common.save': 'Save',
            'common.close': 'Close',
            'common.confirm': 'Confirm',
            'common.yes': 'Yes',
            'common.no': 'No',
            'common.search': 'Search',
            'common.filter': 'Filter',
            'common.sort': 'Sort',
            'common.all': 'All',
            'common.none': 'None',
            'common.free': 'FREE',
            'common.off': 'OFF',

            // Footer
            'footer.copyright': 'Enter at your own risk.',
            'footer.privacy': 'Privacy Policy',
            'footer.terms': 'Terms of Service',
            'footer.contact': 'Contact',

            // Time
            'time.days': 'days',
            'time.hours': 'hours',
            'time.minutes': 'minutes',
            'time.seconds': 'seconds',
            'time.ago': 'ago',

            // Notifications
            'notify.success': 'Success',
            'notify.error': 'Error',
            'notify.warning': 'Warning',
            'notify.info': 'Info',
        },

        es: {
            'nav.home': 'Inicio',
            'nav.games': 'Juegos',
            'nav.challenges': 'Desafíos',
            'nav.achievements': 'Logros',
            'nav.leaderboards': 'Clasificaciones',
            'nav.subscribe': 'Suscribirse',
            'nav.store': 'Tienda',
            'nav.about': 'Acerca de',
            'hero.title': 'ScaryGames',
            'hero.subtitle': 'Entra en la Oscuridad',
            'hero.description': 'Experimenta terroríficos juegos de terror en el navegador. Navega por backrooms embrujados, arrástrate por mazmorras llenas de sombras y sobrevive a tus peores pesadillas.',
            'hero.playNow': 'Jugar Ahora',
            'hero.playingNow': 'jugando ahora',
            'stats.gamesPlayed': 'Partidas Jugadas',
            'stats.activePlayers': 'Jugadores Activos',
            'stats.scaresDelivered': 'Sustos Entregados',
            'stats.hoursSurvived': 'Horas Sobrevividas',
            'section.featured': 'Juego Destacado',
            'section.allGames': 'Todos los Juegos',
            'section.allGamesDesc': 'Elige tu pesadilla',
            'game.play': 'Jugar',
            'game.new': 'NUEVO',
            'tier.free': 'Gratis',
            'tier.survivor': 'Superviviente',
            'tier.hunter': 'Cazador',
            'tier.elderGod': 'Dios Ancestral',
            'common.loading': 'Cargando...',
            'common.error': 'Error',
            'common.cancel': 'Cancelar',
            'common.save': 'Guardar',
            'common.close': 'Cerrar',
            'settings.language': 'Idioma',
        },

        de: {
            'nav.home': 'Startseite',
            'nav.games': 'Spiele',
            'nav.challenges': 'Herausforderungen',
            'nav.achievements': 'Erfolge',
            'nav.leaderboards': 'Bestenlisten',
            'nav.subscribe': 'Abonnieren',
            'nav.store': 'Shop',
            'nav.about': 'Über uns',
            'hero.title': 'ScaryGames',
            'hero.subtitle': 'Betritt die Dunkelheit',
            'hero.description': 'Erlebe erschreckende Browserspiele. Navigiere durch verfluchte Backrooms, kriech durch schattengefüllte Verliese und überlebe deine schlimmsten Albträume.',
            'hero.playNow': 'Jetzt Spielen',
            'hero.playingNow': 'spielen jetzt',
            'stats.gamesPlayed': 'Spiele Gespielt',
            'stats.activePlayers': 'Aktive Spieler',
            'stats.scaresDelivered': 'Schrecken Ausgeliefert',
            'stats.hoursSurvived': 'Stunden Überlebt',
            'section.featured': 'Ausgewähltes Spiel',
            'section.allGames': 'Alle Spiele',
            'section.allGamesDesc': 'Wähle deinen Albtraum',
            'game.play': 'Spielen',
            'game.new': 'NEU',
            'tier.free': 'Kostenlos',
            'tier.survivor': 'Überlebender',
            'tier.hunter': 'Jäger',
            'tier.elderGod': 'Ältester Gott',
            'common.loading': 'Laden...',
            'common.error': 'Fehler',
            'common.cancel': 'Abbrechen',
            'common.save': 'Speichern',
            'common.close': 'Schließen',
            'settings.language': 'Sprache',
        },

        fr: {
            'nav.home': 'Accueil',
            'nav.games': 'Jeux',
            'nav.challenges': 'Défis',
            'nav.achievements': 'Succès',
            'nav.leaderboards': 'Classements',
            'nav.subscribe': "S'abonner",
            'nav.store': 'Boutique',
            'nav.about': 'À propos',
            'hero.title': 'ScaryGames',
            'hero.subtitle': 'Entrez dans les Ténèbres',
            'hero.description': "Vivez des jeux d'horreur terrifiants dans votre navigateur. Naviguez dans des backrooms hantées, rampez dans des donjons remplis d'ombres et survivez à vos pires cauchemars.",
            'hero.playNow': 'Jouer',
            'hero.playingNow': 'jouent maintenant',
            'stats.gamesPlayed': 'Parties Jouées',
            'stats.activePlayers': 'Joueurs Actifs',
            'stats.scaresDelivered': 'Frayeurs Délivrées',
            'stats.hoursSurvived': 'Heures Survécues',
            'section.featured': 'Jeu Vedette',
            'section.allGames': 'Tous les Jeux',
            'section.allGamesDesc': 'Choisissez votre cauchemar',
            'game.play': 'Jouer',
            'game.new': 'NOUVEAU',
            'tier.free': 'Gratuit',
            'tier.survivor': 'Survivant',
            'tier.hunter': 'Chasseur',
            'tier.elderGod': 'Dieu Ancien',
            'common.loading': 'Chargement...',
            'common.error': 'Erreur',
            'common.cancel': 'Annuler',
            'common.save': 'Sauvegarder',
            'common.close': 'Fermer',
            'settings.language': 'Langue',
        },

        ja: {
            'nav.home': 'ホーム',
            'nav.games': 'ゲーム',
            'nav.challenges': 'チャレンジ',
            'nav.achievements': '実績',
            'nav.leaderboards': 'ランキング',
            'nav.subscribe': '登録',
            'nav.store': 'ストア',
            'nav.about': '概要',
            'hero.title': 'ScaryGames',
            'hero.subtitle': '闇に入れ',
            'hero.description': '恐ろしいブラウザホラーゲームを体験しよう。呪われたバックルームを探索し、影に満ちたダンジョンを這い進み、悪夢を生き延びろ。',
            'hero.playNow': '今すぐプレイ',
            'hero.playingNow': '人がプレイ中',
            'stats.gamesPlayed': 'プレイ回数',
            'stats.activePlayers': 'アクティブプレイヤー',
            'stats.scaresDelivered': '恐怖を届けた',
            'stats.hoursSurvived': '生存時間',
            'section.featured': '注目のゲーム',
            'section.allGames': '全てのゲーム',
            'section.allGamesDesc': '悪夢を選べ',
            'game.play': 'プレイ',
            'game.new': '新着',
            'tier.free': '無料',
            'tier.survivor': 'サバイバー',
            'tier.hunter': 'ハンター',
            'tier.elderGod': 'エルダーゴッド',
            'common.loading': '読み込み中...',
            'common.error': 'エラー',
            'common.cancel': 'キャンセル',
            'common.save': '保存',
            'common.close': '閉じる',
            'settings.language': '言語',
        },

        zh: {
            'nav.home': '首页',
            'nav.games': '游戏',
            'nav.challenges': '挑战',
            'nav.achievements': '成就',
            'nav.leaderboards': '排行榜',
            'nav.subscribe': '订阅',
            'nav.store': '商店',
            'nav.about': '关于',
            'hero.title': 'ScaryGames',
            'hero.subtitle': '进入黑暗',
            'hero.description': '体验恐怖的浏览器恐怖游戏。探索闹鬼的后室，爬过充满阴影的地牢，在最可怕的噩梦生存。',
            'hero.playNow': '立即游玩',
            'hero.playingNow': '正在游玩',
            'stats.gamesPlayed': '游戏次数',
            'stats.activePlayers': '活跃玩家',
            'stats.scaresDelivered': '惊吓次数',
            'stats.hoursSurvived': '生存时间',
            'section.featured': '精选游戏',
            'section.allGames': '所有游戏',
            'section.allGamesDesc': '选择你的噩梦',
            'game.play': '游玩',
            'game.new': '新',
            'tier.free': '免费',
            'tier.survivor': '幸存者',
            'tier.hunter': '猎人',
            'tier.elderGod': '旧日支配者',
            'common.loading': '加载中...',
            'common.error': '错误',
            'common.cancel': '取消',
            'common.save': '保存',
            'common.close': '关闭',
            'settings.language': '语言',
        },
    };

    // ═══════════════════════════════════════════════════════════════
    // LANGUAGE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    function detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0].toLowerCase();
        
        // Check if we support this language
        if (SUPPORTED_LANGUAGES[langCode]) {
            return langCode;
        }
        
        return 'en'; // Default to English
    }

    function loadLanguage() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && SUPPORTED_LANGUAGES[saved]) {
                currentLanguage = saved;
            } else {
                currentLanguage = detectBrowserLanguage();
            }
        } catch (e) {
            currentLanguage = detectBrowserLanguage();
        }

        translations = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;
    }

    function saveLanguage() {
        try {
            localStorage.setItem(STORAGE_KEY, currentLanguage);
        } catch (e) {}
    }

    function setLanguage(lang) {
        if (!SUPPORTED_LANGUAGES[lang]) {
            console.error('Unsupported language:', lang);
            return false;
        }

        currentLanguage = lang;
        translations = TRANSLATIONS[lang] || TRANSLATIONS.en;
        saveLanguage();

        // Update all elements with data-i18n attribute
        updateAllElements();

        // Dispatch event
        window.dispatchEvent(new CustomEvent('language-change', {
            detail: { language: lang }
        }));

        return true;
    }

    function getLanguage() {
        return currentLanguage;
    }

    function getSupportedLanguages() {
        return SUPPORTED_LANGUAGES;
    }

    // ═══════════════════════════════════════════════════════════════
    // TRANSLATION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    function t(key, params = {}) {
        let text = translations[key];
        
        if (!text) {
            // Fallback to English
            text = TRANSLATIONS.en[key];
        }
        
        if (!text) {
            // Return key if no translation found
            return key;
        }

        // Replace parameters like {name} with values
        for (const [param, value] of Object.entries(params)) {
            text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), value);
        }

        return text;
    }

    function plural(key, count, params = {}) {
        const pluralKey = count === 1 ? `${key}.one` : `${key}.other`;
        return t(pluralKey, { count, ...params });
    }

    // ═══════════════════════════════════════════════════════════════
    // DOM UPDATE
    // ═══════════════════════════════════════════════════════════════

    function updateAllElements() {
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            el.textContent = t(key);
        });

        // Update all elements with data-i18n-placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            el.placeholder = t(key);
        });

        // Update all elements with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.dataset.i18nTitle;
            el.title = t(key);
        });

        // Update all elements with data-i18n-aria-label attribute
        document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
            const key = el.dataset.i18nAriaLabel;
            el.setAttribute('aria-label', t(key));
        });

        // Update HTML lang attribute
        document.documentElement.lang = currentLanguage;
    }

    // ═══════════════════════════════════════════════════════════════
    // LANGUAGE SELECTOR UI
    // ═══════════════════════════════════════════════════════════════

    function createLanguageSelector() {
        const container = document.createElement('div');
        container.className = 'language-selector';
        container.innerHTML = `
            <button class="language-selector-btn" aria-label="Select language">
                <span class="lang-flag">${SUPPORTED_LANGUAGES[currentLanguage].flag}</span>
                <span class="lang-code">${currentLanguage.toUpperCase()}</span>
                <span class="lang-arrow">▼</span>
            </button>
            <div class="language-dropdown">
                ${Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => `
                    <button class="language-option ${code === currentLanguage ? 'active' : ''}" data-lang="${code}">
                        <span class="lang-flag">${lang.flag}</span>
                        <span class="lang-name">${lang.native}</span>
                    </button>
                `).join('')}
            </div>
        `;

        // Toggle dropdown
        const btn = container.querySelector('.language-selector-btn');
        const dropdown = container.querySelector('.language-dropdown');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('visible');
        });

        // Close on outside click
        document.addEventListener('click', () => {
            dropdown.classList.remove('visible');
        });

        // Language selection
        container.querySelectorAll('.language-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const lang = opt.dataset.lang;
                setLanguage(lang);
                
                // Update button
                container.querySelector('.lang-flag').textContent = SUPPORTED_LANGUAGES[lang].flag;
                container.querySelector('.lang-code').textContent = lang.toUpperCase();
                
                // Update active state
                container.querySelectorAll('.language-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                
                dropdown.classList.remove('visible');
            });
        });

        return container;
    }

    function injectToSelector(container = null) {
        const selector = createLanguageSelector();
        
        if (container) {
            container.appendChild(selector);
        } else {
            // Find footer or create floating selector
            const footer = document.querySelector('.footer-inner') || document.querySelector('.footer');
            if (footer) {
                footer.appendChild(selector);
            } else {
                document.body.appendChild(selector);
            }
        }

        return selector;
    }

    // ═══════════════════════════════════════════════════════════════
    // STYLES
    // ═══════════════════════════════════════════════════════════════

    function injectStyles() {
        if (document.getElementById('i18n-system-styles')) return;

        const style = document.createElement('style');
        style.id = 'i18n-system-styles';
        style.textContent = `
            /* Language Selector */
            .language-selector {
                position: relative;
                display: inline-block;
            }

            .language-selector-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 12px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: var(--text-secondary, #8a8a9a);
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .language-selector-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                color: white;
            }

            .lang-flag {
                font-size: 16px;
            }

            .lang-code {
                font-weight: 500;
            }

            .lang-arrow {
                font-size: 8px;
                opacity: 0.5;
            }

            .language-dropdown {
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                min-width: 150px;
                background: var(--bg-secondary, #12121a);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                opacity: 0;
                visibility: hidden;
                transform: translateX(-50%) translateY(10px);
                transition: all 0.2s;
                z-index: 1000;
                margin-bottom: 8px;
            }

            .language-dropdown.visible {
                opacity: 1;
                visibility: visible;
                transform: translateX(-50%) translateY(0);
            }

            .language-option {
                display: flex;
                align-items: center;
                gap: 10px;
                width: 100%;
                padding: 10px 14px;
                background: none;
                border: none;
                color: var(--text-secondary, #8a8a9a);
                font-size: 13px;
                text-align: left;
                cursor: pointer;
                transition: all 0.15s;
            }

            .language-option:hover {
                background: rgba(255, 255, 255, 0.05);
                color: white;
            }

            .language-option.active {
                background: rgba(204, 17, 34, 0.15);
                color: var(--accent-red, #cc1122);
            }

            .language-option:first-child {
                border-radius: 8px 8px 0 0;
            }

            .language-option:last-child {
                border-radius: 0 0 8px 8px;
            }

            .language-option .lang-flag {
                font-size: 18px;
            }

            .language-option .lang-name {
                flex: 1;
            }

            /* Settings page language section */
            .language-settings {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .language-setting-option {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 14px;
                background: rgba(255, 255, 255, 0.03);
                border: 2px solid transparent;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .language-setting-option:hover {
                background: rgba(255, 255, 255, 0.06);
            }

            .language-setting-option.active {
                border-color: var(--accent-red, #cc1122);
                background: rgba(204, 17, 34, 0.1);
            }

            /* Mobile */
            @media (max-width: 768px) {
                .language-selector-btn {
                    padding: 6px 10px;
                }

                .lang-code {
                    display: none;
                }

                .language-dropdown {
                    left: auto;
                    right: 0;
                    transform: translateX(0) translateY(10px);
                }

                .language-dropdown.visible {
                    transform: translateX(0) translateY(0);
                }
            }
        `;

        document.head.appendChild(style);
    }

    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════

    function init() {
        injectStyles();
        loadLanguage();
        
        // Update elements on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                updateAllElements();
                injectToSelector();
            });
        } else {
            updateAllElements();
            injectToSelector();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // EXPORTS
    // ═══════════════════════════════════════════════════════════════

    window.i18n = {
        init,
        t,
        plural,
        setLanguage,
        getLanguage,
        getSupportedLanguages,
        updateAllElements,
        createLanguageSelector,
        injectToSelector,
        currentLanguage: () => currentLanguage,
    };

    // Also expose as __ for convenience
    window.__ = t;

    // Auto-init
    init();

})();
