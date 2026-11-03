// ESLint flat config
export default [
    {
        ignores: ['node_modules/**', 'assets/**']
    },
    {
        files: ['js/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                window: 'readonly',
                document: 'readonly',
                indexedDB: 'readonly',
                navigator: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                fetch: 'readonly',
                URL: 'readonly',
                Blob: 'readonly',
                FileReader: 'readonly',
                SpeechSynthesisUtterance: 'readonly',
                speechSynthesis: 'readonly',
                MediaRecorder: 'readonly',
                module: 'readonly',
                globalThis: 'readonly',
                self: 'readonly',
                caches: 'readonly',
                // App globals shared across classic scripts
                storage: 'readonly',
                playlistManager: 'readonly',
                audioEngine: 'readonly',
                ui: 'readonly',
                i18n: 'readonly',
                dialog: 'readonly',
                testManager: 'readonly',
                welcomeManager: 'readonly',
                translationService: 'readonly',
                LANGUAGES: 'readonly',
                DEFAULT_PLAYLIST_SETTINGS: 'readonly',
                LANGUAGE_NAMES: 'readonly',
                THEME_NAMES: 'readonly',
                events: 'readonly',
                LanguageLoopLogic: 'readonly',
                populateLanguageSelect: 'readonly',
                getLanguageName: 'readonly',
                getLanguageCodes: 'readonly',
                cloudService: 'readonly'
            }
        },
        rules: {
            // Top-level consts are consumed by other scripts, so only check locals.
            'no-unused-vars': ['warn', { vars: 'local', args: 'after-used' }],
            'no-undef': 'warn'
        }
    },
    {
        // cloud.js is an ES module
        files: ['js/cloud.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module'
        }
    },
    {
        files: ['tests/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module'
        }
    }
];
