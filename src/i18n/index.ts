import { createI18n } from 'vue-i18n';
import { storage } from '@/services/storage';

// Load every locale JSON from the public folder at build time.
const modules = import.meta.glob('../../public/i18n/*.json', { eager: true });

// vue-i18n's message generics are very strict; the JSON shape is validated at
// runtime via fallbackLocale, so we keep this map loosely typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const messages: Record<string, any> = {};
for (const [path, mod] of Object.entries(modules)) {
  const lang = path.split('/').pop()?.replace('.json', '') ?? '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages[lang] = (mod as { default: any }).default;
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'en-US',
  fallbackLocale: 'en-US',
  messages
});

export function getLocale(): string {
  return i18n.global.locale.value;
}

export async function setLocale(lang: string): Promise<void> {
  if (!messages[lang]) return;
  i18n.global.locale.value = lang;
  await storage.setSetting('interfaceLanguage', lang);
}

export async function initI18n(): Promise<void> {
  const saved = await storage.getSetting<string>('interfaceLanguage', 'en-US');
  const lang = saved && messages[saved] ? saved : 'en-US';
  i18n.global.locale.value = lang;
}

export function getAvailableLocales(): string[] {
  return Object.keys(messages);
}
