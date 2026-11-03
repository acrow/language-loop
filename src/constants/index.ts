import type { PlaylistSettings } from '@/types/models';

export const APP_VERSION = '2.0.0';

export const DEFAULT_PLAYLIST_SETTINGS: Readonly<PlaylistSettings> = Object.freeze({
  repeatCount: 2,
  pauseDuration: 1,
  speechRate: 1.0,
  preferredVoice: '',
  speakNative: false
});

export const LANGUAGE_NAMES: Readonly<Record<string, string>> = Object.freeze({
  'en-US': 'English',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  'zh-HK': 'Chinese (Hong Kong)',
  'ja-JP': 'Japanese',
  'es-ES': 'Spanish',
  'fr-FR': 'French',
  'de-DE': 'German',
  'ko-KR': 'Korean',
  'it-IT': 'Italian'
});

// Compact labels for language badges (region subtag, e.g. CN, TW, US).
export const LANGUAGE_ABBREVIATIONS: Readonly<Record<string, string>> = Object.freeze({
  'en-US': 'US',
  'zh-CN': 'CN',
  'zh-TW': 'TW',
  'zh-HK': 'HK',
  'ja-JP': 'JP',
  'es-ES': 'ES',
  'fr-FR': 'FR',
  'de-DE': 'DE',
  'ko-KR': 'KR',
  'it-IT': 'IT'
});

export const THEME_NAMES: Readonly<Record<string, string>> = Object.freeze({
  dark: 'Dark Purple',
  light: 'Light',
  ocean: 'Ocean',
  forest: 'Forest',
  sunset: 'Sunset',
  midnight: 'Midnight'
});

export const THEMES = ['dark', 'light', 'ocean', 'forest', 'sunset', 'midnight'] as const;
export type ThemeName = (typeof THEMES)[number];

// Colorful emoji icons available for playlist/group icons.
// Emoji are free, render in full color on every platform, and require no
// extra dependency or network request (important for this offline-first PWA).
// Grouped roughly by theme: study, language, goals, media, nature, objects.
export const CONTENT_ICONS = [
  // Study & learning
  '📖',
  '📚',
  '📝',
  '✍️',
  '🎓',
  '🏫',
  '🧠',
  '💡',
  '🔤',
  '🧩',
  // Language & speaking
  '🗣️',
  '🎤',
  '🎧',
  '💬',
  '🌍',
  '🌎',
  '🌏',
  '🗺️',
  // Goals & motivation
  '🎯',
  '⭐',
  '✨',
  '🏆',
  '🥇',
  '🔥',
  '💪',
  '✅',
  '🚀',
  // Media & entertainment
  '🎵',
  '🎶',
  '🎬',
  '📺',
  '📻',
  '🎮',
  '🎨',
  // Nature & mood
  '🌱',
  '🌸',
  '🌊',
  '🌙',
  '☀️',
  '🌈',
  '❤️',
  // Objects & symbols
  '📁',
  '📂',
  '🗂️',
  '🔖',
  '📌',
  '🧪',
  '🔬',
  '🔁',
  '🔊',
  '🔔',
  '⏰'
] as const;

export type ContentIcon = (typeof CONTENT_ICONS)[number];

// Older versions stored monochrome lucide icon names. Map them to their
// colorful emoji equivalents so existing playlists/groups keep working.
const LEGACY_ICON_MAP: Readonly<Record<string, string>> = Object.freeze({
  book: '📖',
  bookmark: '🔖',
  target: '🎯',
  star: '⭐',
  sparkles: '✨',
  lightbulb: '💡',
  graduation: '🎓',
  music: '🎵',
  globe: '🌍',
  languages: '🗣️',
  brush: '🎨',
  folder: '📁',
  writing: '✍️',
  speaking: '🎤',
  repeat: '🔁',
  volume: '🔊'
});

export function isContentIcon(icon: string | undefined | null): boolean {
  return (
    !!icon &&
    ((CONTENT_ICONS as readonly string[]).includes(icon) || icon in LEGACY_ICON_MAP)
  );
}

/**
 * Resolve a stored icon value to a colorful emoji.
 * Accepts both new emoji values and legacy lucide names.
 * Returns `null` when the value is not a known content icon.
 */
export function resolveContentIcon(icon: string | undefined | null): string | null {
  if (!icon) return null;
  if ((CONTENT_ICONS as readonly string[]).includes(icon)) return icon;
  return LEGACY_ICON_MAP[icon] ?? null;
}
