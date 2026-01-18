// Language Configuration
// Central source of truth for all supported languages

const LANGUAGES = [
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

// Helper function to populate a select element with language options
function populateLanguageSelect(selectElement, useNativeName = false, selectedValue = null) {
    if (!selectElement) return;

    selectElement.innerHTML = '';

    LANGUAGES.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = useNativeName ? lang.nativeName : lang.name;

        if (selectedValue && lang.code === selectedValue) {
            option.selected = true;
        }

        selectElement.appendChild(option);
    });
}

// Helper function to get language name by code
function getLanguageName(code, useNativeName = false) {
    const lang = LANGUAGES.find(l => l.code === code);
    if (!lang) return code;
    return useNativeName ? lang.nativeName : lang.name;
}

// Helper function to get all language codes
function getLanguageCodes() {
    return LANGUAGES.map(l => l.code);
}
