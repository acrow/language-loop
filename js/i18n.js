// Internationalization Manager
class I18nManager {
    constructor() {
        this.currentLang = 'en';
        this.translations = {};
        this.fallbackLang = 'en';
    }

    async init() {
        // Load saved language preference
        const savedLang = await storage.getSetting('interfaceLanguage', 'en');
        await this.loadLanguage(savedLang);
    }

    async loadLanguage(lang) {
        try {
            const response = await fetch(`i18n/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load ${lang}.json`);
            }
            this.translations[lang] = await response.json();
            this.currentLang = lang;

            // If not English, also load English as fallback
            if (lang !== this.fallbackLang && !this.translations[this.fallbackLang]) {
                const fallbackResponse = await fetch(`i18n/${this.fallbackLang}.json`);
                if (fallbackResponse.ok) {
                    this.translations[this.fallbackLang] = await fallbackResponse.json();
                }
            }

            this.updateUI();
            return true;
        } catch (error) {
            console.error('Error loading language:', error);
            // Fall back to English
            if (lang !== this.fallbackLang) {
                return this.loadLanguage(this.fallbackLang);
            }
            return false;
        }
    }

    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang];

        // Try to get value from current language
        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                value = undefined;
                break;
            }
        }

        // Fall back to English if not found
        if (value === undefined && this.currentLang !== this.fallbackLang) {
            value = this.translations[this.fallbackLang];
            for (const k of keys) {
                if (value && typeof value === 'object') {
                    value = value[k];
                } else {
                    value = undefined;
                    break;
                }
            }
        }

        // If still not found, return the key
        if (value === undefined) {
            return key;
        }

        // Replace parameters
        if (typeof value === 'string') {
            return value.replace(/\{(\w+)\}/g, (match, param) => {
                return params[param] !== undefined ? params[param] : match;
            });
        }

        return value;
    }

    updateUI() {
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = this.t(key);

            // Update based on element type
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.hasAttribute('placeholder')) {
                    el.placeholder = text;
                } else {
                    el.value = text;
                }
            } else {
                el.textContent = text;
            }
        });

        // Update elements with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = this.t(key);
        });
    }

    async setLanguage(lang) {
        await this.loadLanguage(lang);
        await storage.setSetting('interfaceLanguage', lang);
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    getAvailableLanguages() {
        return [
            { code: 'en', name: 'English' },
            { code: 'zh', name: '中文' },
            { code: 'ja', name: '日本語' }
        ];
    }
}

// Create global instance
const i18n = new I18nManager();
