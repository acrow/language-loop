// Translation Service
class TranslationService {
    constructor() {
        this.apiUrl = 'https://api.mymemory.translated.net/get';
        this.cache = new Map(); // Cache translations to reduce API calls
    }

    // Map language codes to API format
    mapLanguageCode(code) {
        const mapping = {
            'en-US': 'en',
            'zh-CN': 'zh-CN',
            'ja-JP': 'ja'
        };
        return mapping[code] || code;
    }

    // Generate cache key
    getCacheKey(text, sourceLang, targetLang) {
        return `${sourceLang}|${targetLang}|${text}`;
    }

    // Translate text using MyMemory API
    async translate(text, sourceLang, targetLang) {
        if (!text || !text.trim()) {
            return '';
        }

        // Check cache first
        const cacheKey = this.getCacheKey(text, sourceLang, targetLang);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const source = this.mapLanguageCode(sourceLang);
            const target = this.mapLanguageCode(targetLang);

            const url = `${this.apiUrl}?q=${encodeURIComponent(text)}&langpair=${source}|${target}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Translation API request failed');
            }

            const data = await response.json();

            if (data.responseStatus === 200 && data.responseData) {
                const translation = data.responseData.translatedText;

                // Cache the result
                this.cache.set(cacheKey, translation);

                return translation;
            } else {
                throw new Error('Translation failed');
            }
        } catch (error) {
            console.error('Translation error:', error);

            // Provide language-specific error messages
            const langNames = {
                'en': 'English',
                'en-US': 'English',
                'zh-CN': 'Chinese',
                'ja': 'Japanese',
                'ja-JP': 'Japanese'
            };

            const sourceName = langNames[sourceLang] || langNames[this.mapLanguageCode(sourceLang)] || sourceLang;
            const targetName = langNames[targetLang] || langNames[this.mapLanguageCode(targetLang)] || targetLang;

            // Return a helpful message if translation fails
            return `[Translation from ${sourceName} to ${targetName} unavailable - please enter manually]`;
        }
    }

    // Translate multiple sentences in batch
    async translateBatch(sentences, sourceLang, targetLang) {
        const translations = [];

        for (const sentence of sentences) {
            if (sentence.nativeText && sentence.nativeText.trim()) {
                // Already has translation
                translations.push(sentence);
            } else {
                // Needs translation
                const translation = await this.translate(sentence.targetText, sourceLang, targetLang);
                translations.push({
                    ...sentence,
                    nativeText: translation
                });

                // Small delay to avoid rate limiting
                await this.sleep(500);
            }
        }

        return translations;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Clear cache (useful for memory management)
    clearCache() {
        this.cache.clear();
    }
}

// Create global instance
const translationService = new TranslationService();
