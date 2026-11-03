// Translation service backed by the MyMemory API.
// Ported from the legacy `js/translation.js`.

import { mapLanguageCode } from '@/lib/logic';

const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  en: 'English',
  'en-US': 'English',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  'zh-HK': 'Chinese (Hong Kong)',
  ja: 'Japanese',
  'ja-JP': 'Japanese',
  es: 'Spanish',
  'es-ES': 'Spanish',
  fr: 'French',
  'fr-FR': 'French',
  de: 'German',
  'de-DE': 'German',
  ko: 'Korean',
  'ko-KR': 'Korean',
  it: 'Italian',
  'it-IT': 'Italian'
};

export class TranslationService {
  private apiUrl = 'https://api.mymemory.translated.net/get';
  private cache = new Map<string, string>();

  private getCacheKey(text: string, sourceLang: string, targetLang: string): string {
    return `${sourceLang}|${targetLang}|${text}`;
  }

  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    if (!text || !text.trim()) return '';

    const cacheKey = this.getCacheKey(text, sourceLang, targetLang);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as string;
    }

    try {
      const source = mapLanguageCode(sourceLang);
      const target = mapLanguageCode(targetLang);
      const url = `${this.apiUrl}?q=${encodeURIComponent(text)}&langpair=${source}|${target}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Translation API request failed');

      const data = await response.json();
      if (data.responseStatus === 200 && data.responseData) {
        const translation = data.responseData.translatedText as string;
        this.cache.set(cacheKey, translation);
        return translation;
      }
      throw new Error('Translation failed');
    } catch (error) {
      console.error('Translation error:', error);
      const sourceName =
        LANGUAGE_DISPLAY_NAMES[sourceLang] ||
        LANGUAGE_DISPLAY_NAMES[mapLanguageCode(sourceLang)] ||
        sourceLang;
      const targetName =
        LANGUAGE_DISPLAY_NAMES[targetLang] ||
        LANGUAGE_DISPLAY_NAMES[mapLanguageCode(targetLang)] ||
        targetLang;
      return `[Translation from ${sourceName} to ${targetName} unavailable - please enter manually]`;
    }
  }

  async translateBatch<T extends { targetText: string; nativeText: string }>(
    sentences: T[],
    sourceLang: string,
    targetLang: string
  ): Promise<T[]> {
    const translations: T[] = [];

    for (const sentence of sentences) {
      if (sentence.nativeText && sentence.nativeText.trim()) {
        translations.push(sentence);
      } else {
        const translation = await this.translate(sentence.targetText, sourceLang, targetLang);
        translations.push({ ...sentence, nativeText: translation });
        await this.sleep(500);
      }
    }

    return translations;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const translationService = new TranslationService();
