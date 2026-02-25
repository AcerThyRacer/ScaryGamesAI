/* ============================================================
   HELLAPHOBIA - PHASE 18: LOCALIZATION
   12 Languages | Cultural Adaptation | Font Support | RTL
   ============================================================ */

(function() {
    'use strict';

    // ===== PHASE 18: SUPPORTED LANGUAGES =====
    const SUPPORTED_LANGUAGES = {
        en: { name: 'English', native: 'English', flag: '🇺🇸', direction: 'ltr', font: 'Inter' },
        ja: { name: 'Japanese', native: '日本語', flag: '🇯🇵', direction: 'ltr', font: 'Noto Sans JP' },
        es: { name: 'Spanish', native: 'Español', flag: '🇪🇸', direction: 'ltr', font: 'Inter' },
        fr: { name: 'French', native: 'Français', flag: '🇫🇷', direction: 'ltr', font: 'Inter' },
        de: { name: 'German', native: 'Deutsch', flag: '🇩🇪', direction: 'ltr', font: 'Inter' },
        ru: { name: 'Russian', native: 'Русский', flag: '🇷🇺', direction: 'ltr', font: 'Noto Sans' },
        zh: { name: 'Chinese (Simplified)', native: '简体中文', flag: '🇨🇳', direction: 'ltr', font: 'Noto Sans SC' },
        ko: { name: 'Korean', native: '한국어', flag: '🇰🇷', direction: 'ltr', font: 'Noto Sans KR' },
        pt: { name: 'Portuguese', native: 'Português', flag: '🇵🇹', direction: 'ltr', font: 'Inter' },
        it: { name: 'Italian', native: 'Italiano', flag: '🇮🇹', direction: 'ltr', font: 'Inter' },
        pl: { name: 'Polish', native: 'Polski', flag: '🇵🇱', direction: 'ltr', font: 'Inter' },
        tr: { name: 'Turkish', native: 'Türkçe', flag: '🇹🇷', direction: 'ltr', font: 'Inter' }
    };

    // ===== PHASE 18: TRANSLATION DATABASE =====
    const TranslationDatabase = {
        // UI Translations
        ui: {
            en: {
                // Main menu
                'menu.title': 'HELLAPHOBIA',
                'menu.subtitle': 'ヘラフォビア',
                'menu.start': 'Enter the Nightmare',
                'menu.continue': 'Continue',
                'menu.options': 'Options',
                'menu.credits': 'Credits',
                'menu.exit': 'Exit',
                
                // Game HUD
                'hud.health': 'HP',
                'hud.sanity': 'Sanity',
                'hud.phase': 'Phase',
                'hud.deaths': 'Deaths',
                'hud.time': 'Time',
                'hud.score': 'Score',
                
                // Pause menu
                'pause.title': 'PAUSED',
                'pause.resume': 'Resume',
                'pause.restart': 'Restart',
                'pause.options': 'Options',
                'pause.quit': 'Quit to Menu',
                
                // Game over
                'gameover.title': 'YOU DIED',
                'gameover.retry': 'Try Again',
                'gameover.menu': 'Main Menu',
                
                // Options
                'options.title': 'Options',
                'options.video': 'Video',
                'options.audio': 'Audio',
                'options.controls': 'Controls',
                'options.accessibility': 'Accessibility',
                'options.language': 'Language',
                
                // Difficulty
                'difficulty.title': 'Difficulty',
                'difficulty.very_easy': 'Very Easy',
                'difficulty.easy': 'Easy',
                'difficulty.normal': 'Normal',
                'difficulty.hard': 'Hard',
                'difficulty.nightmare': 'Nightmare',
                
                // Common
                'common.back': 'Back',
                'common.save': 'Save',
                'common.load': 'Load',
                'common.delete': 'Delete',
                'common.confirm': 'Confirm',
                'common.cancel': 'Cancel',
                'common.ok': 'OK',
                'common.yes': 'Yes',
                'common.no': 'No'
            },
            ja: {
                'menu.title': 'ヘラフォビア',
                'menu.subtitle': '悪夢へようこそ',
                'menu.start': '悪夢に入る',
                'menu.continue': '続ける',
                'menu.options': 'オプション',
                'menu.credits': 'クレジット',
                'menu.exit': '終了',
                'hud.health': '体力',
                'hud.sanity': '正気',
                'hud.phase': 'フェーズ',
                'hud.deaths': '死亡',
                'hud.time': '時間',
                'hud.score': 'スコア',
                'pause.title': '一時停止',
                'pause.resume': '再開',
                'pause.restart': 'リスタート',
                'pause.options': 'オプション',
                'pause.quit': 'メニューに戻る',
                'gameover.title': '死亡',
                'gameover.retry': '再挑戦',
                'gameover.menu': 'メインメニュー',
                'options.title': 'オプション',
                'options.video': 'ビデオ',
                'options.audio': 'オーディオ',
                'options.controls': 'コントロール',
                'options.accessibility': 'アクセシビリティ',
                'options.language': '言語',
                'difficulty.title': '難易度',
                'difficulty.very_easy': 'とても簡単',
                'difficulty.easy': '簡単',
                'difficulty.normal': '普通',
                'difficulty.hard': '難しい',
                'difficulty.nightmare': '悪夢',
                'common.back': '戻る',
                'common.save': '保存',
                'common.load': '読み込み',
                'common.delete': '削除',
                'common.confirm': '確認',
                'common.cancel': 'キャンセル',
                'common.ok': 'OK',
                'common.yes': 'はい',
                'common.no': 'いいえ'
            },
            es: {
                'menu.title': 'HELLAPHOBIA',
                'menu.subtitle': 'Bienvenido a la Pesadilla',
                'menu.start': 'Entrar en la Pesadilla',
                'menu.continue': 'Continuar',
                'menu.options': 'Opciones',
                'menu.credits': 'Créditos',
                'menu.exit': 'Salir',
                'hud.health': 'Vida',
                'hud.sanity': 'Cordura',
                'hud.phase': 'Fase',
                'hud.deaths': 'Muertes',
                'hud.time': 'Tiempo',
                'hud.score': 'Puntuación',
                'pause.title': 'PAUSA',
                'pause.resume': 'Continuar',
                'pause.restart': 'Reiniciar',
                'pause.options': 'Opciones',
                'pause.quit': 'Menú Principal',
                'gameover.title': 'HAS MUERTO',
                'gameover.retry': 'Intentar de Nuevo',
                'gameover.menu': 'Menú Principal',
                'options.title': 'Opciones',
                'options.video': 'Vídeo',
                'options.audio': 'Audio',
                'options.controls': 'Controles',
                'options.accessibility': 'Accesibilidad',
                'options.language': 'Idioma',
                'difficulty.title': 'Dificultad',
                'difficulty.very_easy': 'Muy Fácil',
                'difficulty.easy': 'Fácil',
                'difficulty.normal': 'Normal',
                'difficulty.hard': 'Difícil',
                'difficulty.nightmare': 'Pesadilla',
                'common.back': 'Atrás',
                'common.save': 'Guardar',
                'common.load': 'Cargar',
                'common.delete': 'Eliminar',
                'common.confirm': 'Confirmar',
                'common.cancel': 'Cancelar',
                'common.ok': 'OK',
                'common.yes': 'Sí',
                'common.no': 'No'
            },
            fr: {
                'menu.title': 'HELLAPHOBIA',
                'menu.subtitle': 'Bienvenue dans le Cauchemar',
                'menu.start': 'Entrer dans le Cauchemar',
                'menu.continue': 'Continuer',
                'menu.options': 'Options',
                'menu.credits': 'Crédits',
                'menu.exit': 'Quitter',
                'hud.health': 'Vie',
                'hud.sanity': 'Santé Mentale',
                'hud.phase': 'Phase',
                'hud.deaths': 'Décès',
                'hud.time': 'Temps',
                'hud.score': 'Score',
                'pause.title': 'PAUSE',
                'pause.resume': 'Reprendre',
                'pause.restart': 'Redémarrer',
                'pause.options': 'Options',
                'pause.quit': 'Menu Principal',
                'gameover.title': 'VOUS ÊTES MORT',
                'gameover.retry': 'Réessayer',
                'gameover.menu': 'Menu Principal',
                'options.title': 'Options',
                'options.video': 'Vidéo',
                'options.audio': 'Audio',
                'options.controls': 'Contrôles',
                'options.accessibility': 'Accessibilité',
                'options.language': 'Langue',
                'difficulty.title': 'Difficulté',
                'difficulty.very_easy': 'Très Facile',
                'difficulty.easy': 'Facile',
                'difficulty.normal': 'Normal',
                'difficulty.hard': 'Difficile',
                'difficulty.nightmare': 'Cauchemar',
                'common.back': 'Retour',
                'common.save': 'Sauvegarder',
                'common.load': 'Charger',
                'common.delete': 'Supprimer',
                'common.confirm': 'Confirmer',
                'common.cancel': 'Annuler',
                'common.ok': 'OK',
                'common.yes': 'Oui',
                'common.no': 'Non'
            },
            de: {
                'menu.title': 'HELLAPHOBIA',
                'menu.subtitle': 'Willkommen im Albtraum',
                'menu.start': 'Albtraum Betreten',
                'menu.continue': 'Fortsetzen',
                'menu.options': 'Optionen',
                'menu.credits': 'Credits',
                'menu.exit': 'Beenden',
                'hud.health': 'Leben',
                'hud.sanity': 'Geisteszustand',
                'hud.phase': 'Phase',
                'hud.deaths': 'Tode',
                'hud.time': 'Zeit',
                'hud.score': 'Punktzahl',
                'pause.title': 'PAUSE',
                'pause.resume': 'Fortsetzen',
                'pause.restart': 'Neustart',
                'pause.options': 'Optionen',
                'pause.quit': 'Hauptmenü',
                'gameover.title': 'DU BIST GESTORBEN',
                'gameover.retry': 'Erneut Versuchen',
                'gameover.menu': 'Hauptmenü',
                'options.title': 'Optionen',
                'options.video': 'Video',
                'options.audio': 'Audio',
                'options.controls': 'Steuerung',
                'options.accessibility': 'Barrierefreiheit',
                'options.language': 'Sprache',
                'difficulty.title': 'Schwierigkeit',
                'difficulty.very_easy': 'Sehr Einfach',
                'difficulty.easy': 'Einfach',
                'difficulty.normal': 'Normal',
                'difficulty.hard': 'Schwer',
                'difficulty.nightmare': 'Albtraum',
                'common.back': 'Zurück',
                'common.save': 'Speichern',
                'common.load': 'Laden',
                'common.delete': 'Löschen',
                'common.confirm': 'Bestätigen',
                'common.cancel': 'Abbrechen',
                'common.ok': 'OK',
                'common.yes': 'Ja',
                'common.no': 'Nein'
            },
            ru: {
                'menu.title': 'HELLAPHOBIA',
                'menu.subtitle': 'Добро пожаловать в кошмар',
                'menu.start': 'Войти в кошмар',
                'menu.continue': 'Продолжить',
                'menu.options': 'Опции',
                'menu.credits': 'Титры',
                'menu.exit': 'Выход',
                'hud.health': 'Здоровье',
                'hud.sanity': 'Рассудок',
                'hud.phase': 'Фаза',
                'hud.deaths': 'Смерти',
                'hud.time': 'Время',
                'hud.score': 'Счёт',
                'pause.title': 'ПАУЗА',
                'pause.resume': 'Продолжить',
                'pause.restart': 'Перезапуск',
                'pause.options': 'Опции',
                'pause.quit': 'Главное меню',
                'gameover.title': 'ВЫ ПОГИБЛИ',
                'gameover.retry': 'Попробовать снова',
                'gameover.menu': 'Главное меню',
                'options.title': 'Опции',
                'options.video': 'Видео',
                'options.audio': 'Аудио',
                'options.controls': 'Управление',
                'options.accessibility': 'Доступность',
                'options.language': 'Язык',
                'difficulty.title': 'Сложность',
                'difficulty.very_easy': 'Очень легко',
                'difficulty.easy': 'Легко',
                'difficulty.normal': 'Нормально',
                'difficulty.hard': 'Трудно',
                'difficulty.nightmare': 'Кошмар',
                'common.back': 'Назад',
                'common.save': 'Сохранить',
                'common.load': 'Загрузить',
                'common.delete': 'Удалить',
                'common.confirm': 'Подтвердить',
                'common.cancel': 'Отмена',
                'common.ok': 'OK',
                'common.yes': 'Да',
                'common.no': 'Нет'
            },
            zh: {
                'menu.title': '地狱恐惧',
                'menu.subtitle': '欢迎来到噩梦',
                'menu.start': '进入噩梦',
                'menu.continue': '继续',
                'menu.options': '选项',
                'menu.credits': '制作人员',
                'menu.exit': '退出',
                'hud.health': '生命',
                'hud.sanity': '理智',
                'hud.phase': '阶段',
                'hud.deaths': '死亡',
                'hud.time': '时间',
                'hud.score': '分数',
                'pause.title': '暂停',
                'pause.resume': '继续',
                'pause.restart': '重新开始',
                'pause.options': '选项',
                'pause.quit': '返回主菜单',
                'gameover.title': '你死了',
                'gameover.retry': '再试一次',
                'gameover.menu': '主菜单',
                'options.title': '选项',
                'options.video': '视频',
                'options.audio': '音频',
                'options.controls': '控制',
                'options.accessibility': '无障碍',
                'options.language': '语言',
                'difficulty.title': '难度',
                'difficulty.very_easy': '非常简单',
                'difficulty.easy': '简单',
                'difficulty.normal': '普通',
                'difficulty.hard': '困难',
                'difficulty.nightmare': '噩梦',
                'common.back': '返回',
                'common.save': '保存',
                'common.load': '加载',
                'common.delete': '删除',
                'common.confirm': '确认',
                'common.cancel': '取消',
                'common.ok': '确定',
                'common.yes': '是',
                'common.no': '否'
            },
            ko: {
                'menu.title': '헬라포비아',
                'menu.subtitle': '악몽에 오신 것을 환영합니다',
                'menu.start': '악몽 들어가기',
                'menu.continue': '계속하기',
                'menu.options': '옵션',
                'menu.credits': '크레딧',
                'menu.exit': '종료',
                'hud.health': '체력',
                'hud.sanity': '정신력',
                'hud.phase': '단계',
                'hud.deaths': '사망',
                'hud.time': '시간',
                'hud.score': '점수',
                'pause.title': '일시정지',
                'pause.resume': '재개',
                'pause.restart': '재시작',
                'pause.options': '옵션',
                'pause.quit': '메인 메뉴',
                'gameover.title': '사망했습니다',
                'gameover.retry': '다시 시도',
                'gameover.menu': '메인 메뉴',
                'options.title': '옵션',
                'options.video': '비디오',
                'options.audio': '오디오',
                'options.controls': '조작',
                'options.accessibility': '접근성',
                'options.language': '언어',
                'difficulty.title': '난이도',
                'difficulty.very_easy': '매우 쉬움',
                'difficulty.easy': '쉬움',
                'difficulty.normal': '보통',
                'difficulty.hard': '어려움',
                'difficulty.nightmare': '악몽',
                'common.back': '뒤로',
                'common.save': '저장',
                'common.load': '불러오기',
                'common.delete': '삭제',
                'common.confirm': '확인',
                'common.cancel': '취소',
                'common.ok': '확인',
                'common.yes': '예',
                'common.no': '아니오'
            },
            pt: {
                'menu.title': 'HELLAPHOBIA',
                'menu.subtitle': 'Bem-vindo ao Pesadelo',
                'menu.start': 'Entrar no Pesadelo',
                'menu.continue': 'Continuar',
                'menu.options': 'Opções',
                'menu.credits': 'Créditos',
                'menu.exit': 'Sair',
                'hud.health': 'Vida',
                'hud.sanity': 'Sanidade',
                'hud.phase': 'Fase',
                'hud.deaths': 'Mortes',
                'hud.time': 'Tempo',
                'hud.score': 'Pontuação',
                'pause.title': 'PAUSA',
                'pause.resume': 'Continuar',
                'pause.restart': 'Reiniciar',
                'pause.options': 'Opções',
                'pause.quit': 'Menu Principal',
                'gameover.title': 'VOCÊ MORREU',
                'gameover.retry': 'Tentar Novamente',
                'gameover.menu': 'Menu Principal',
                'options.title': 'Opções',
                'options.video': 'Vídeo',
                'options.audio': 'Áudio',
                'options.controls': 'Controles',
                'options.accessibility': 'Acessibilidade',
                'options.language': 'Idioma',
                'difficulty.title': 'Dificuldade',
                'difficulty.very_easy': 'Muito Fácil',
                'difficulty.easy': 'Fácil',
                'difficulty.normal': 'Normal',
                'difficulty.hard': 'Difícil',
                'difficulty.nightmare': 'Pesadelo',
                'common.back': 'Voltar',
                'common.save': 'Salvar',
                'common.load': 'Carregar',
                'common.delete': 'Excluir',
                'common.confirm': 'Confirmar',
                'common.cancel': 'Cancelar',
                'common.ok': 'OK',
                'common.yes': 'Sim',
                'common.no': 'Não'
            },
            it: {
                'menu.title': 'HELLAPHOBIA',
                'menu.subtitle': 'Benvenuto nell\'Incubo',
                'menu.start': 'Entra nell\'Incubo',
                'menu.continue': 'Continua',
                'menu.options': 'Opzioni',
                'menu.credits': 'Crediti',
                'menu.exit': 'Esci',
                'hud.health': 'Vita',
                'hud.sanity': 'Sanità Mentale',
                'hud.phase': 'Fase',
                'hud.deaths': 'Morti',
                'hud.time': 'Tempo',
                'hud.score': 'Punteggio',
                'pause.title': 'PAUSA',
                'pause.resume': 'Riprendi',
                'pause.restart': 'Riavvia',
                'pause.options': 'Opzioni',
                'pause.quit': 'Menu Principale',
                'gameover.title': 'SEI MORTO',
                'gameover.retry': 'Riprova',
                'gameover.menu': 'Menu Principale',
                'options.title': 'Opzioni',
                'options.video': 'Video',
                'options.audio': 'Audio',
                'options.controls': 'Controlli',
                'options.accessibility': 'Accessibilità',
                'options.language': 'Lingua',
                'difficulty.title': 'Difficoltà',
                'difficulty.very_easy': 'Molto Facile',
                'difficulty.easy': 'Facile',
                'difficulty.normal': 'Normale',
                'difficulty.hard': 'Difficile',
                'difficulty.nightmare': 'Incubo',
                'common.back': 'Indietro',
                'common.save': 'Salva',
                'common.load': 'Carica',
                'common.delete': 'Elimina',
                'common.confirm': 'Conferma',
                'common.cancel': 'Annulla',
                'common.ok': 'OK',
                'common.yes': 'Sì',
                'common.no': 'No'
            },
            pl: {
                'menu.title': 'HELLAPHOBIA',
                'menu.subtitle': 'Witaj w Koszmarze',
                'menu.start': 'Wejdź do Koszmaru',
                'menu.continue': 'Kontynuuj',
                'menu.options': 'Opcje',
                'menu.credits': 'Napisy',
                'menu.exit': 'Wyjdź',
                'hud.health': 'Zdrowie',
                'hud.sanity': 'Poczytalność',
                'hud.phase': 'Faza',
                'hud.deaths': 'Zgony',
                'hud.time': 'Czas',
                'hud.score': 'Wynik',
                'pause.title': 'PAUZA',
                'pause.resume': 'Wznów',
                'pause.restart': 'Restart',
                'pause.options': 'Opcje',
                'pause.quit': 'Menu Główne',
                'gameover.title': 'NIE ŻYJESZ',
                'gameover.retry': 'Spróbuj Ponownie',
                'gameover.menu': 'Menu Główne',
                'options.title': 'Opcje',
                'options.video': 'Wideo',
                'options.audio': 'Audio',
                'options.controls': 'Sterowanie',
                'options.accessibility': 'Dostępność',
                'options.language': 'Język',
                'difficulty.title': 'Poziom Trudności',
                'difficulty.very_easy': 'Bardzo Łatwy',
                'difficulty.easy': 'Łatwy',
                'difficulty.normal': 'Normalny',
                'difficulty.hard': 'Trudny',
                'difficulty.nightmare': 'Koszmar',
                'common.back': 'Powrót',
                'common.save': 'Zapisz',
                'common.load': 'Wczytaj',
                'common.delete': 'Usuń',
                'common.confirm': 'Potwierdź',
                'common.cancel': 'Anuluj',
                'common.ok': 'OK',
                'common.yes': 'Tak',
                'common.no': 'Nie'
            },
            tr: {
                'menu.title': 'HELLAPHOBIA',
                'menu.subtitle': 'Kabus\'a Hoş Geldiniz',
                'menu.start': 'Kabus\'a Gir',
                'menu.continue': 'Devam Et',
                'menu.options': 'Seçenekler',
                'menu.credits': 'Emeği Geçenler',
                'menu.exit': 'Çıkış',
                'hud.health': 'Can',
                'hud.sanity': 'Akıl Sağlığı',
                'hud.phase': 'Bölüm',
                'hud.deaths': 'Ölümler',
                'hud.time': 'Süre',
                'hud.score': 'Skor',
                'pause.title': 'DURAKLAT',
                'pause.resume': 'Devam Et',
                'pause.restart': 'Yeniden Başlat',
                'pause.options': 'Seçenekler',
                'pause.quit': 'Ana Menü',
                'gameover.title': 'ÖLDÜNÜZ',
                'gameover.retry': 'Tekrar Dene',
                'gameover.menu': 'Ana Menü',
                'options.title': 'Seçenekler',
                'options.video': 'Görüntü',
                'options.audio': 'Ses',
                'options.controls': 'Kontroller',
                'options.accessibility': 'Erişilebilirlik',
                'options.language': 'Dil',
                'difficulty.title': 'Zorluk',
                'difficulty.very_easy': 'Çok Kolay',
                'difficulty.easy': 'Kolay',
                'difficulty.normal': 'Normal',
                'difficulty.hard': 'Zor',
                'difficulty.nightmare': 'Kabus',
                'common.back': 'Geri',
                'common.save': 'Kaydet',
                'common.load': 'Yükle',
                'common.delete': 'Sil',
                'common.confirm': 'Onayla',
                'common.cancel': 'İptal',
                'common.ok': 'Tamam',
                'common.yes': 'Evet',
                'common.no': 'Hayır'
            }
        },

        // Achievement Translations (sample)
        achievements: {
            en: {
                'story_001.name': 'First Steps',
                'story_001.desc': 'Complete Phase 1',
                'story_002.name': 'Getting Started',
                'story_002.desc': 'Complete Phase 3'
            },
            ja: {
                'story_001.name': '最初のステップ',
                'story_001.desc': 'フェーズ 1 をクリア',
                'story_002.name': 'スタート',
                'story_002.desc': 'フェーズ 3 をクリア'
            }
        }
    };

    // ===== PHASE 18: LOCALIZATION MANAGER =====
    const LocalizationManager = {
        currentLanguage: 'en',
        fallbackLanguage: 'en',
        loadedLanguages: ['en'],
        customTranslations: {},

        init() {
            this.loadSavedLanguage();
            this.applyLanguage();
            console.log('Phase 18: Localization Manager initialized');
        },

        // Set language
        setLanguage(langCode) {
            if (!SUPPORTED_LANGUAGES[langCode]) {
                console.error('[Localization] Unsupported language:', langCode);
                return false;
            }

            this.currentLanguage = langCode;
            localStorage.setItem('hellaphobia_language', langCode);

            // Load language if not loaded
            if (!this.loadedLanguages.includes(langCode)) {
                this.loadLanguage(langCode);
            }

            this.applyLanguage();

            EventTracker.track('language_changed', { language: langCode });
            console.log('[Localization] Language set to:', SUPPORTED_LANGUAGES[langCode].name);

            return true;
        },

        // Get translation
        t(key, params = {}) {
            const lang = this.currentLanguage;
            let translation = null;

            // Check custom translations first
            if (this.customTranslations[lang]?.[key]) {
                translation = this.customTranslations[lang][key];
            }

            // Check UI translations
            if (!translation && TranslationDatabase.ui[lang]?.[key]) {
                translation = TranslationDatabase.ui[lang][key];
            }

            // Check achievement translations
            if (!translation && TranslationDatabase.achievements[lang]?.[key]) {
                translation = TranslationDatabase.achievements[lang][key];
            }

            // Fallback to English
            if (!translation && TranslationDatabase.ui.en?.[key]) {
                translation = TranslationDatabase.ui.en[key];
            }

            // If still no translation, return key
            if (!translation) {
                console.warn(`[Localization] Missing translation: ${key}`);
                return key;
            }

            // Replace parameters
            return this.replaceParams(translation, params);
        },

        // Replace parameters in translation
        replaceParams(text, params) {
            return text.replace(/\{(\w+)\}/g, (match, key) => {
                return params[key] !== undefined ? params[key] : match;
            });
        },

        // Apply language to DOM
        applyLanguage() {
            const langData = SUPPORTED_LANGUAGES[this.currentLanguage];
            if (!langData) return;

            // Set HTML lang attribute
            document.documentElement.lang = this.currentLanguage;

            // Set text direction
            document.documentElement.dir = langData.direction;

            // Apply font
            document.body.style.fontFamily = `"${langData.font}", sans-serif`;

            // Update all elements with data-i18n attribute
            document.querySelectorAll('[data-i18n]').forEach(element => {
                const key = element.getAttribute('data-i18n');
                const params = JSON.parse(element.getAttribute('data-i18n-params') || '{}');
                element.textContent = this.t(key, params);
            });

            // Update title
            const titleElement = document.querySelector('title');
            if (titleElement) {
                titleElement.textContent = this.t('menu.title');
            }
        },

        // Load additional language
        async loadLanguage(langCode) {
            if (this.loadedLanguages.includes(langCode)) return;

            try {
                // In production, this would fetch additional translations
                // For now, we use the bundled translations
                this.loadedLanguages.push(langCode);
                console.log('[Localization] Loaded:', langCode);
            } catch (error) {
                console.error('[Localization] Failed to load:', langCode, error);
            }
        },

        // Add custom translation
        addTranslation(langCode, key, value) {
            if (!this.customTranslations[langCode]) {
                this.customTranslations[langCode] = {};
            }
            this.customTranslations[langCode][key] = value;
        },

        // Load saved language
        loadSavedLanguage() {
            const saved = localStorage.getItem('hellaphobia_language');
            if (saved && SUPPORTED_LANGUAGES[saved]) {
                this.currentLanguage = saved;
            } else {
                // Auto-detect language
                this.currentLanguage = this.detectBrowserLanguage();
            }
        },

        // Detect browser language
        detectBrowserLanguage() {
            const browserLang = navigator.language.slice(0, 2);
            if (SUPPORTED_LANGUAGES[browserLang]) {
                return browserLang;
            }
            return 'en';
        },

        // Get current language info
        getCurrentLanguage() {
            return {
                code: this.currentLanguage,
                ...SUPPORTED_LANGUAGES[this.currentLanguage]
            };
        },

        // Get all supported languages
        getSupportedLanguages() {
            return Object.entries(SUPPORTED_LANGUAGES).map(([code, data]) => ({
                code,
                ...data
            }));
        },

        // Get translation progress
        getTranslationProgress() {
            const totalKeys = Object.keys(TranslationDatabase.ui.en).length;
            const progress = {};

            for (const lang in SUPPORTED_LANGUAGES) {
                if (lang === 'en') continue;

                const translatedKeys = Object.keys(TranslationDatabase.ui[lang] || {}).length;
                progress[lang] = {
                    total: totalKeys,
                    translated: translatedKeys,
                    percent: Math.round((translatedKeys / totalKeys) * 100)
                };
            }

            return progress;
        },

        // Export translations
        exportTranslations(langCode) {
            const translations = {
                ui: TranslationDatabase.ui[langCode] || {},
                achievements: TranslationDatabase.achievements[langCode] || {}
            };
            return JSON.stringify(translations, null, 2);
        },

        // Import translations
        importTranslations(langCode, jsonString) {
            try {
                const translations = JSON.parse(jsonString);
                
                if (translations.ui) {
                    TranslationDatabase.ui[langCode] = {
                        ...TranslationDatabase.ui[langCode],
                        ...translations.ui
                    };
                }
                
                if (translations.achievements) {
                    TranslationDatabase.achievements[langCode] = {
                        ...TranslationDatabase.achievements[langCode],
                        ...translations.achievements
                    };
                }

                console.log('[Localization] Imported translations for:', langCode);
                return true;
            } catch (error) {
                console.error('[Localization] Import failed:', error);
                return false;
            }
        }
    };

    // ===== PHASE 18: FONT MANAGER =====
    const FontManager = {
        loadedFonts: [],

        init() {
            this.preloadFonts();
            console.log('Phase 18: Font Manager initialized');
        },

        // Preload fonts for all languages
        preloadFonts() {
            const fonts = [...new Set(Object.values(SUPPORTED_LANGUAGES).map(l => l.font))];
            
            fonts.forEach(fontName => {
                this.loadFont(fontName);
            });
        },

        // Load font
        loadFont(fontName) {
            if (this.loadedFonts.includes(fontName)) return;

            const font = new FontFace(fontName, `url(https://fonts.googleapis.com/css2?family=${fontName.replace(' ', '+')}:wght@400;700&display=swap)`);
            
            font.load().then(() => {
                document.fonts.add(font);
                this.loadedFonts.push(fontName);
                console.log('[FontManager] Loaded:', fontName);
            }).catch(error => {
                console.warn('[FontManager] Failed to load:', fontName, error);
            });
        },

        // Get font for language
        getFontForLanguage(langCode) {
            return SUPPORTED_LANGUAGES[langCode]?.font || 'Inter';
        },

        // Set font
        setFont(fontName) {
            document.body.style.fontFamily = `"${fontName}", sans-serif`;
        }
    };

    // ===== PHASE 18: CULTURAL ADAPTATION =====
    const CulturalAdapter = {
        adaptations: {},

        init() {
            console.log('Phase 18: Cultural Adapter initialized');
        },

        // Get cultural adaptations for language
        getAdaptations(langCode) {
            const adaptations = {
                ja: {
                    dateFormat: 'YYYY/MM/DD',
                    timeFormat: 'HH:mm',
                    numberFormat: 'ja-JP',
                    currencyFormat: '¥{0}',
                    honorifics: true
                },
                zh: {
                    dateFormat: 'YYYY 年 MM 月 DD 日',
                    timeFormat: 'HH:mm',
                    numberFormat: 'zh-CN',
                    currencyFormat: '¥{0}'
                },
                de: {
                    dateFormat: 'DD.MM.YYYY',
                    timeFormat: 'HH:mm',
                    numberFormat: 'de-DE',
                    currencyFormat: '{0} €'
                },
                fr: {
                    dateFormat: 'DD/MM/YYYY',
                    timeFormat: 'HH:mm',
                    numberFormat: 'fr-FR',
                    currencyFormat: '{0} €'
                }
            };

            return adaptations[langCode] || {
                dateFormat: 'MM/DD/YYYY',
                timeFormat: 'HH:mm A',
                numberFormat: 'en-US',
                currencyFormat: '${0}'
            };
        },

        // Format date
        formatDate(date, langCode) {
            const adaptations = this.getAdaptations(langCode);
            return new Intl.DateTimeFormat(langCode, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }).format(date);
        },

        // Format number
        formatNumber(number, langCode) {
            const adaptations = this.getAdaptations(langCode);
            return new Intl.NumberFormat(adaptations.numberFormat).format(number);
        },

        // Format currency
        formatCurrency(amount, langCode) {
            const adaptations = this.getAdaptations(langCode);
            return adaptations.currencyFormat.replace('{0}', this.formatNumber(amount, langCode));
        }
    };

    // ===== PHASE 18: MAIN LOCALIZATION SYSTEM =====
    const Phase18Localization = {
        initialized: false,

        init() {
            if (this.initialized) return;

            LocalizationManager.init();
            FontManager.init();
            CulturalAdapter.init();

            this.initialized = true;
            console.log('Phase 18: Localization initialized');
        },

        // Translation
        translate: (key, params) => LocalizationManager.t(key, params),
        setLanguage: (code) => LocalizationManager.setLanguage(code),
        getCurrentLanguage: () => LocalizationManager.getCurrentLanguage(),
        getSupportedLanguages: () => LocalizationManager.getSupportedLanguages(),

        // Fonts
        setFont: (fontName) => FontManager.setFont(fontName),

        // Cultural
        formatDate: (date, lang) => CulturalAdapter.formatDate(date, lang),
        formatNumber: (num, lang) => CulturalAdapter.formatNumber(num, lang),
        formatCurrency: (amt, lang) => CulturalAdapter.formatCurrency(amt, lang),

        // Translation management
        addTranslation: (lang, key, value) => LocalizationManager.addTranslation(lang, key, value),
        exportTranslations: (lang) => LocalizationManager.exportTranslations(lang),
        importTranslations: (lang, json) => LocalizationManager.importTranslations(lang, json),
        getTranslationProgress: () => LocalizationManager.getTranslationProgress()
    };

    // Export Phase 18 systems
    window.Phase18Localization = Phase18Localization;
    window.LocalizationManager = LocalizationManager;
    window.FontManager = FontManager;
    window.CulturalAdapter = CulturalAdapter;
    window.SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES;
    window.TranslationDatabase = TranslationDatabase;

    // Global translation shortcut
    window.t = (key, params) => LocalizationManager.t(key, params);

})();
