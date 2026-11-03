// Welcome / first-run setup
// UI text is handled by the i18n system via data-i18n attributes.
class WelcomeManager {
    constructor() {
        this.currentLang = 'en-US';
    }

    async init() {
        // Load saved global settings
        const targetLang = await storage.getSetting('globalTargetLang', 'en-US');
        const interfaceLang = await storage.getSetting('interfaceLanguage', 'en-US');

        const targetSelect = document.getElementById('global-target-lang');
        const nativeSelect = document.getElementById('global-native-lang');
        if (targetSelect) targetSelect.value = targetLang;
        if (nativeSelect) nativeSelect.value = interfaceLang;

        // Interface language change
        nativeSelect?.addEventListener('change', async (e) => {
            await i18n.setLanguage(e.target.value);
        });

        // Save target language when changed
        targetSelect?.addEventListener('change', async (e) => {
            await storage.setSetting('globalTargetLang', e.target.value);
        });
    }

    async getGlobalLanguages() {
        const targetLang = await storage.getSetting('globalTargetLang', 'en-US');
        const nativeLang = await storage.getSetting('interfaceLanguage', 'en-US');
        return { targetLang, nativeLang };
    }
}

// Create global instance
const welcomeManager = new WelcomeManager();
