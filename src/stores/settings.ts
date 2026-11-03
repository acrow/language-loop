import { defineStore } from 'pinia';
import { ref } from 'vue';
import { storage } from '@/services/storage';
import { useTheme } from '@/composables/useTheme';
import { setLocale } from '@/i18n';
import type { PlaylistSettings } from '@/types/models';

export const useSettingsStore = defineStore('settings', () => {
  const { currentTheme, setTheme, initTheme } = useTheme();

  const globalTargetLang = ref('en-US');
  const interfaceLanguage = ref('en-US');

  async function loadSettings(): Promise<void> {
    globalTargetLang.value =
      (await storage.getSetting<string>('globalTargetLang', 'en-US')) || 'en-US';
    interfaceLanguage.value =
      (await storage.getSetting<string>('interfaceLanguage', 'en-US')) || 'en-US';
  }

  async function setGlobalTargetLang(lang: string): Promise<void> {
    globalTargetLang.value = lang;
    await storage.setSetting('globalTargetLang', lang);
  }

  async function setInterfaceLanguage(lang: string): Promise<void> {
    interfaceLanguage.value = lang;
    await storage.setSetting('interfaceLanguage', lang);
    await setLocale(lang);
  }

  async function savePlaylistSettings(
    playlistId: number,
    settings: PlaylistSettings
  ): Promise<void> {
    await storage.updatePlaylist(playlistId, { settings });
  }

  return {
    currentTheme,
    globalTargetLang,
    interfaceLanguage,
    loadSettings,
    setGlobalTargetLang,
    setInterfaceLanguage,
    savePlaylistSettings,
    setTheme,
    initTheme
  };
});
