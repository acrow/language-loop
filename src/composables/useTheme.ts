import { ref } from 'vue';
import { storage } from '@/services/storage';
import { THEMES, type ThemeName } from '@/constants';

const currentTheme = ref<ThemeName>('dark');

function applyTheme(theme: ThemeName): void {
  currentTheme.value = theme;
  document.documentElement.setAttribute('data-theme', theme);
}

function getSystemTheme(): ThemeName {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

export function useTheme() {
  async function initTheme(): Promise<void> {
    const saved = await storage.getSetting<string>('theme', null);
    const theme = (saved as ThemeName) || getSystemTheme();
    applyTheme(theme);
  }

  async function setTheme(theme: ThemeName): Promise<void> {
    applyTheme(theme);
    await storage.setSetting('theme', theme);
  }

  return {
    currentTheme,
    themes: THEMES,
    initTheme,
    setTheme,
    applyTheme,
    getSystemTheme
  };
}
