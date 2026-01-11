// Dynamic UI Translation System using Translation API
class I18n {
    constructor() {
        this.currentLang = 'en-US';
        this.originalTexts = new Map(); // Store original English text
        this.translationCache = new Map(); // Cache translations
        this.isTranslating = false;
    }

    async init() {
        // Store all original English text
        this.storeOriginalTexts();

        // Load saved native language
        const nativeLang = await storage.getSetting('globalNativeLang', 'zh-CN');
        this.currentLang = nativeLang;

        // Translate if not English
        if (nativeLang !== 'en-US') {
            await this.translateUI(nativeLang);
        }
    }

    storeOriginalTexts() {
        // Store all text content and placeholders
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');

            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                this.originalTexts.set(key, element.placeholder);
            } else {
                this.originalTexts.set(key, element.textContent.trim());
            }
        });
    }

    async setLanguage(lang) {
        if (this.currentLang === lang) return;

        this.currentLang = lang;

        if (lang === 'en-US') {
            // Restore original English text
            this.restoreOriginalTexts();
        } else {
            // Translate to target language
            await this.translateUI(lang);
        }
    }

    restoreOriginalTexts() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const originalText = this.originalTexts.get(key);

            if (originalText) {
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = originalText;
                } else {
                    element.textContent = originalText;
                }
            }
        });
    }

    async translateUI(targetLang) {
        if (this.isTranslating) return;
        this.isTranslating = true;

        try {
            // Collect all texts to translate
            const textsToTranslate = [];
            const elements = [];

            document.querySelectorAll('[data-i18n]').forEach(element => {
                const key = element.getAttribute('data-i18n');
                const originalText = this.originalTexts.get(key);

                if (originalText) {
                    textsToTranslate.push(originalText);
                    elements.push(element);
                }
            });

            // Translate in batches to avoid rate limiting
            const batchSize = 5;
            for (let i = 0; i < textsToTranslate.length; i += batchSize) {
                const batch = textsToTranslate.slice(i, i + batchSize);
                const batchElements = elements.slice(i, i + batchSize);

                await Promise.all(batch.map(async (text, index) => {
                    const element = batchElements[index];
                    const cacheKey = `${text}|${targetLang}`;

                    // Check cache first
                    let translation = this.translationCache.get(cacheKey);

                    if (!translation) {
                        // Translate
                        translation = await translationService.translate(text, 'en-US', targetLang);
                        this.translationCache.set(cacheKey, translation);
                    }

                    // Apply translation
                    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                        element.placeholder = translation;
                    } else {
                        element.textContent = translation;
                    }
                }));

                // Small delay between batches
                if (i + batchSize < textsToTranslate.length) {
                    await this.sleep(300);
                }
            }
        } catch (error) {
            console.error('UI translation error:', error);
        } finally {
            this.isTranslating = false;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get translated text for dynamic content (alerts, etc.)
    async t(text, fromLang = 'en-US') {
        if (this.currentLang === 'en-US') {
            return text;
        }

        const cacheKey = `${text}|${this.currentLang}`;
        let translation = this.translationCache.get(cacheKey);

        if (!translation) {
            translation = await translationService.translate(text, fromLang, this.currentLang);
            this.translationCache.set(cacheKey, translation);
        }

        return translation;
    }

    clearCache() {
        this.translationCache.clear();
    }
}

// Create global instance
const i18n = new I18n();
