// Shared application constants
// Central source of truth for defaults and display names.

const APP_VERSION = '1.1.0';

const DEFAULT_PLAYLIST_SETTINGS = Object.freeze({
    repeatCount: 2,
    pauseDuration: 1,
    speechRate: 1.0,
    preferredVoice: '',
    speakNative: false
});

const LANGUAGE_NAMES = Object.freeze({
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

const THEME_NAMES = Object.freeze({
    'dark': '🟣 Dark Purple',
    'light': '☀️ Light',
    'ocean': '🌊 Ocean',
    'forest': '🌲 Forest',
    'sunset': '🌅 Sunset',
    'midnight': '🌑 Midnight'
});
