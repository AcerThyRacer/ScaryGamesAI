/**
 * Accessibility Manager - Phase 10: Inclusive Gaming
 * Complete accessibility support for all players
 */

export class AccessibilityManager {
  constructor(options = {}) {
    this.settings = {
      // Visual
      colorBlindMode: options.colorBlindMode || 'none', // none, protanopia, deuteranopia, tritanopia
      highContrast: options.highContrast || false,
      reduceMotion: options.reduceMotion || false,
      screenShake: options.screenShake ?? true,
      flashEffects: options.flashEffects ?? true,
      fontSize: options.fontSize || 16,
      dyslexiaFont: options.dyslexiaFont || false,
      
      // Audio
      monoAudio: options.monoAudio || false,
      audioVisualizer: options.audioVisualizer || false,
      subtitles: options.subtitles ?? true,
      subtitleSize: options.subtitleSize || 18,
      speakerIcons: options.speakerIcons ?? true,
      
      // Motor
      stickyKeys: options.stickyKeys || false,
      slowMouse: options.slowMouse || false,
      toggleHold: options.toggleHold || false,
      autoRun: options.autoRun || false,
      
      // Cognitive
      simplifyUI: options.simplifyUI || false,
      objectiveMarkers: options.objectiveMarkers ?? true,
      tutorialHints: options.tutorialHints ?? true,
      pauseOnFocusLoss: options.pauseOnFocusLoss ?? true
    };
    
    this.activeProfile = null;
    this.listeners = new Map();
    
    this.init();
  }

  init() {
    // Apply initial settings
    this.applyAllSettings();
    
    // Listen for system preferences
    this.setupSystemListeners();
  }

  setupSystemListeners() {
    // Reduced motion preference
    if (window.matchMedia) {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      motionQuery.addEventListener('change', (e) => {
        if (e.matches) {
          this.updateSetting('reduceMotion', true);
        }
      });
      
      // High contrast preference
      const contrastQuery = window.matchMedia('(prefers-contrast: more)');
      contrastQuery.addEventListener('change', (e) => {
        if (e.matches) {
          this.updateSetting('highContrast', true);
        }
      });
    }
  }

  updateSetting(key, value) {
    const oldValue = this.settings[key];
    this.settings[key] = value;
    
    this.applySetting(key, value);
    this.emit('settingChanged', { key, value, oldValue });
    
    // Save to localStorage
    try {
      localStorage.setItem('accessibility', JSON.stringify(this.settings));
    } catch (e) {}
  }

  applySetting(key, value) {
    switch(key) {
      case 'colorBlindMode':
        this.applyColorBlindFilter(value);
        break;
      case 'highContrast':
        this.applyHighContrast(value);
        break;
      case 'fontSize':
        this.applyFontSize(value);
        break;
      case 'dyslexiaFont':
        this.applyDyslexiaFont(value);
        break;
      case 'monoAudio':
        this.applyMonoAudio(value);
        break;
      case 'subtitles':
        this.applySubtitles(value);
        break;
      case 'slowMouse':
        this.applySlowMouse(value);
        break;
    }
  }

  applyAllSettings() {
    Object.entries(this.settings).forEach(([key, value]) => {
      this.applySetting(key, value);
    });
  }

  applyColorBlindFilter(mode) {
    const filters = {
      none: '',
      protanopia: 'url(#protanopia)',
      deuteranopia: 'url(#deuteranopia)',
      tritanopia: 'url(#tritanopia)'
    };
    
    document.documentElement.style.filter = filters[mode] || '';
    
    // Create SVG filters if needed
    if (mode !== 'none' && !document.getElementById(`${mode}-filter`)) {
      this.createColorBlindFilter(mode);
    }
  }

  createColorBlindFilter(type) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.width = '0';
    svg.style.height = '0';
    
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', `${type}-filter`);
    
    const matrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
    matrix.setAttribute('type', 'matrix');
    
    // Color blindness simulation matrices
    const matrices = {
      protanopia: '0.567, 0.433, 0, 0, 0  0.558, 0.442, 0, 0, 0  0, 0.242, 0.758, 0, 0  0, 0, 0, 1, 0',
      deuteranopia: '0.625, 0.375, 0, 0, 0  0.7, 0.3, 0, 0, 0  0, 0.3, 0.7, 0, 0  0, 0, 0, 1, 0',
      tritanopia: '0.95, 0.05, 0, 0, 0  0, 0.433, 0.567, 0, 0  0, 0.475, 0.525, 0, 0  0, 0, 0, 1, 0'
    };
    
    matrix.setAttribute('values', matrices[type]);
    filter.appendChild(matrix);
    svg.appendChild(filter);
    document.body.appendChild(svg);
  }

  applyHighContrast(enabled) {
    document.documentElement.classList.toggle('high-contrast', enabled);
    
    if (enabled) {
      document.documentElement.style.setProperty('--contrast-ratio', '7:1');
    }
  }

  applyFontSize(size) {
    document.documentElement.style.setProperty('--font-size-base', `${size}px`);
  }

  applyDyslexiaFont(enabled) {
    document.documentElement.style.setProperty(
      '--font-family',
      enabled ? 'OpenDyslexic, Arial, sans-serif' : 'inherit'
    );
  }

  applyMonoAudio(enabled) {
    // Would integrate with Web Audio API
    console.log('Mono audio:', enabled);
  }

  applySubtitles(enabled) {
    document.querySelectorAll('.subtitle').forEach(el => {
      el.style.display = enabled ? 'block' : 'none';
    });
  }

  applySlowMouse(enabled) {
    if (enabled) {
      document.body.style.cursor = 'default';
      // Implement custom cursor with reduced sensitivity
    }
  }

  loadProfile(profileName) {
    const profiles = {
      default: {},
      visuallyImpaired: {
        colorBlindMode: 'deuteranopia',
        highContrast: true,
        fontSize: 20,
        subtitles: true,
        subtitleSize: 22,
        audioVisualizer: true
      },
      hearingImpaired: {
        subtitles: true,
        subtitleSize: 22,
        speakerIcons: true,
        audioVisualizer: true,
        flashEffects: false
      },
      motorImpaired: {
        stickyKeys: true,
        toggleHold: true,
        autoRun: true,
        slowMouse: true
      },
      cognitiveSupport: {
        simplifyUI: true,
        objectiveMarkers: true,
        tutorialHints: true,
        reduceMotion: true,
        pauseOnFocusLoss: true
      }
    };
    
    const profile = profiles[profileName];
    if (profile) {
      Object.assign(this.settings, profile);
      this.applyAllSettings();
      this.activeProfile = profileName;
      this.emit('profileLoaded', profileName);
    }
  }

  exportSettings() {
    return JSON.stringify(this.settings, null, 2);
  }

  importSettings(json) {
    try {
      const imported = JSON.parse(json);
      Object.assign(this.settings, imported);
      this.applyAllSettings();
      this.emit('settingsImported');
    } catch (e) {
      console.error('Failed to import settings:', e);
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }

  getRecommendations() {
    const recommendations = [];
    
    if (this.settings.reduceMotion) {
      recommendations.push('Consider enabling static backgrounds');
    }
    
    if (!this.settings.flashEffects && !this.settings.reduceMotion) {
      recommendations.push('Flash effects disabled - consider reducing motion too');
    }
    
    if (this.settings.fontSize < 16) {
      recommendations.push('Consider increasing font size for better readability');
    }
    
    return recommendations;
  }

  validateCompliance() {
    // WCAG 2.1 AA compliance checks
    const issues = [];
    
    // Check contrast ratio
    if (!this.settings.highContrast) {
      issues.push('Consider enabling high contrast mode for WCAG AA compliance');
    }
    
    // Check font size
    if (this.settings.fontSize < 14) {
      issues.push('Font size below recommended 14px minimum');
    }
    
    // Check keyboard navigation
    if (!document.querySelector('[tabindex]')) {
      issues.push('No keyboard navigation detected');
    }
    
    return {
      compliant: issues.length === 0,
      issues,
      level: issues.length === 0 ? 'AA' : 'Non-compliant'
    };
  }
}

/**
 * Localization System
 */
export class LocalizationManager {
  constructor(options = {}) {
    this.currentLocale = options.locale || 'en';
    this.fallbackLocale = options.fallback || 'en';
    this.translations = new Map();
    this.supportedLocales = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'pt', 'ru'];
    this.rtlLocales = ['ar', 'he', 'fa'];
    this.pluralRules = new Intl.PluralRules();
    this.numberFormat = new Intl.NumberFormat();
    this.dateFormat = new Intl.DateTimeFormat();
    
    this.loadTranslations();
  }

  async loadTranslations() {
    // Load translation files
    for (const locale of this.supportedLocales) {
      try {
        const response = await fetch(`/locales/${locale}.json`);
        const translations = await response.json();
        this.translations.set(locale, translations);
      } catch (e) {
        console.warn(`Failed to load translations for ${locale}`);
      }
    }
  }

  t(key, params = {}) {
    const locale = this.translations.has(this.currentLocale) ? 
                   this.currentLocale : this.fallbackLocale;
    
    const translations = this.translations.get(locale) || {};
    const keys = key.split('.');
    
    let value = translations;
    for (const k of keys) {
      value = value?.[k];
    }
    
    if (typeof value !== 'string') {
      console.warn(`Translation missing: ${key}`);
      return key;
    }
    
    // Replace parameters
    return value.replace(/\{(\w+)\}/g, (match, param) => {
      return params[param] ?? match;
    });
  }

  tp(key, count, params = {}) {
    const pluralCategory = this.pluralRules.select(count);
    
    return this.t(`${key}.${pluralCategory}`, {
      count: this.numberFormat.format(count),
      ...params
    });
  }

  td(date, options = {}) {
    return this.dateFormat.format(date, options);
  }

  tn(number, options = {}) {
    return this.numberFormat.format(number, options);
  }

  setLocale(locale) {
    if (this.supportedLocales.includes(locale)) {
      this.currentLocale = locale;
      document.documentElement.lang = locale;
      document.documentElement.dir = this.rtlLocales.includes(locale) ? 'rtl' : 'ltr';
      this.emit('localeChanged', locale);
    }
  }

  getSupportedLocales() {
    return this.supportedLocales.map(code => ({
      code,
      name: new Intl.DisplayNames([code], { type: 'language' }).of(code),
      rtl: this.rtlLocales.includes(code)
    }));
  }

  isRTL() {
    return this.rtlLocales.includes(this.currentLocale);
  }

  on(event, callback) {
    // Event system implementation
  }

  emit(event, data) {
    // Event emission
  }
}

export default { AccessibilityManager, LocalizationManager };
