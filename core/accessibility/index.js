/**
 * Accessibility Module - Phase 10
 */
export { AccessibilityManager, LocalizationManager } from './AccessibilityManager.js';

export function createAccessibilitySystem(options = {}) {
  const a11y = new AccessibilityManager(options.accessibility);
  const i18n = new LocalizationManager(options.localization);
  
  return {
    a11y,
    i18n,
    
    // Quick access methods
    updateSetting(key, value) {
      a11y.updateSetting(key, value);
    },
    
    loadProfile(profileName) {
      a11y.loadProfile(profileName);
    },
    
    setLocale(locale) {
      i18n.setLocale(locale);
    },
    
    t(key, params) {
      return i18n.t(key, params);
    },
    
    export() {
      return {
        accessibility: JSON.parse(a11y.exportSettings()),
        locale: i18n.currentLocale
      };
    },
    
    import(data) {
      if (data.accessibility) {
        a11y.importSettings(JSON.stringify(data.accessibility));
      }
      if (data.locale) {
        i18n.setLocale(data.locale);
      }
    }
  };
}

export default { 
  AccessibilityManager, 
  LocalizationManager, 
  createAccessibilitySystem 
};
