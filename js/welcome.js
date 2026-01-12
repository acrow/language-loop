// Welcome Page Translations
const welcomeTranslations = {
    'en-US': {
        title: 'Welcome to Language Loop',
        subtitle: 'Learn languages through audio repetition',
        step1Title: 'Create Playlists',
        step1Desc: 'Organize your sentences into playlists, just like music',
        step2Title: 'Auto Voice Generation',
        step2Desc: 'Sentences are spoken automatically in your target language',
        step3Title: 'Repeat & Learn',
        step3Desc: 'Configure repetitions and practice continuously'
    },
    'zh-CN': {
        title: '欢迎使用语言循环',
        subtitle: '通过音频重复学习语言',
        step1Title: '创建播放列表',
        step1Desc: '将句子整理成播放列表，就像音乐一样',
        step2Title: '自动语音生成',
        step2Desc: '句子会自动用目标语言朗读',
        step3Title: '重复学习',
        step3Desc: '配置重复次数并持续练习'
    },
    'ja-JP': {
        title: 'Language Loopへようこそ',
        subtitle: '音声の繰り返しで言語を学ぶ',
        step1Title: 'プレイリストを作成',
        step1Desc: '音楽のように文をプレイリストに整理',
        step2Title: '自動音声生成',
        step2Desc: 'ターゲット言語で自動的に文を読み上げ',
        step3Title: '繰り返して学習',
        step3Desc: '繰り返し回数を設定して継続的に練習'
    }
};

class WelcomeManager {
    constructor() {
        this.currentLang = 'en-US';
    }

    async init() {
        // Load saved global settings
        const targetLang = await storage.getSetting('globalTargetLang', 'en-US');
        const interfaceLang = await storage.getSetting('interfaceLanguage', 'en');

        document.getElementById('global-target-lang').value = targetLang;
        document.getElementById('global-native-lang').value = interfaceLang;

        // Set up event listener for interface language change
        document.getElementById('global-native-lang')?.addEventListener('change', async (e) => {
            const lang = e.target.value;
            await i18n.setLanguage(lang);
        });

        // Save target language when changed
        document.getElementById('global-target-lang')?.addEventListener('change', async (e) => {
            await storage.setSetting('globalTargetLang', e.target.value);
        });
    }

    updateWelcomeText(lang) {
        const translations = welcomeTranslations[lang] || welcomeTranslations['en-US'];

        document.getElementById('welcome-title').textContent = translations.title;
        document.getElementById('welcome-subtitle').textContent = translations.subtitle;
        document.getElementById('step1-title').textContent = translations.step1Title;
        document.getElementById('step1-desc').textContent = translations.step1Desc;
        document.getElementById('step2-title').textContent = translations.step2Title;
        document.getElementById('step2-desc').textContent = translations.step2Desc;
        document.getElementById('step3-title').textContent = translations.step3Title;
        document.getElementById('step3-desc').textContent = translations.step3Desc;

        this.currentLang = lang;
    }

    async getGlobalLanguages() {
        const targetLang = await storage.getSetting('globalTargetLang', 'en-US');
        const nativeLang = await storage.getSetting('globalNativeLang', 'zh-CN');
        return { targetLang, nativeLang };
    }
}

// Create global instance
const welcomeManager = new WelcomeManager();
