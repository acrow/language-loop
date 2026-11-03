// Central source of truth for all supported languages.

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export const LANGUAGES: readonly Language[] = [
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional - Taiwan)', nativeName: '繁體中文 (台灣)' },
  { code: 'zh-HK', name: 'Chinese (Traditional - Hong Kong)', nativeName: '繁體中文 (香港)' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어' },
  { code: 'it-IT', name: 'Italian', nativeName: 'Italiano' }
];

export function getLanguageName(code: string, useNativeName = false): string {
  const lang = LANGUAGES.find((l) => l.code === code);
  if (!lang) return code;
  return useNativeName ? lang.nativeName : lang.name;
}

export function getLanguageCodes(): string[] {
  return LANGUAGES.map((l) => l.code);
}
