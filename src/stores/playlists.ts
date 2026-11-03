import { defineStore } from 'pinia';
import { ref } from 'vue';
import { storage } from '@/services/storage';
import { translationService } from '@/services/translation';
import { audioEngine } from '@/services/audio';
import type { ExportPlaylist, Playlist, Sentence } from '@/types/models';

export interface SentenceInput {
  targetText: string;
  nativeText: string;
  memo?: string;
  customAudio?: Blob | null;
  speechRate?: number | null;
}

export const usePlaylistsStore = defineStore('playlists', () => {
  const playlists = ref<Playlist[]>([]);
  const currentPlaylistId = ref<number | null>(null);
  const currentSentences = ref<Sentence[]>([]);
  const loading = ref(false);

  async function loadPlaylists(): Promise<void> {
    loading.value = true;
    try {
      const all = await storage.getAllPlaylists();
      const order = await storage.getPlaylistOrder();
      if (order && order.length > 0) {
        const orderMap = new Map(order.map((id, index) => [id, index]));
        all.sort((a, b) => {
          const ia = orderMap.has(a.id as number) ? (orderMap.get(a.id as number) as number) : 9999;
          const ib = orderMap.has(b.id as number) ? (orderMap.get(b.id as number) as number) : 9999;
          return ia - ib;
        });
      }
      playlists.value = all;
    } finally {
      loading.value = false;
    }
  }

  async function reorderPlaylists(sourceId: number, targetId: number): Promise<void> {
    const ids = playlists.value.map((p) => p.id as number);
    const srcIdx = ids.indexOf(sourceId);
    const dstIdx = ids.indexOf(targetId);
    if (srcIdx === -1 || dstIdx === -1 || srcIdx === dstIdx) return;

    ids.splice(srcIdx, 1);
    ids.splice(dstIdx, 0, sourceId);
    await storage.savePlaylistOrder(ids);
    await loadPlaylists();
  }

  async function createPlaylist(
    name: string,
    targetLang: string,
    nativeLang: string,
    icon = '📖',
    description = '',
    groupId: number | null = null
  ): Promise<number> {
    if (!name || !name.trim()) throw new Error('Playlist name cannot be empty');
    const id = await storage.createPlaylist(
      name.trim(),
      targetLang,
      nativeLang,
      icon,
      description,
      groupId
    );
    await loadPlaylists();
    return id;
  }

  async function getPlaylist(id: number): Promise<Playlist | undefined> {
    return storage.getPlaylist(id);
  }

  async function updatePlaylist(id: number, updates: Partial<Playlist>): Promise<void> {
    await storage.updatePlaylist(id, updates);
    await loadPlaylists();
  }

  async function renamePlaylist(id: number, newName: string): Promise<void> {
    if (!newName || !newName.trim()) throw new Error('Playlist name cannot be empty');
    await storage.updatePlaylist(id, { name: newName.trim() });
    await loadPlaylists();
  }

  async function deletePlaylist(id: number): Promise<void> {
    await storage.deletePlaylist(id);
    if (currentPlaylistId.value === id) {
      currentPlaylistId.value = null;
      currentSentences.value = [];
    }
    await loadPlaylists();
  }

  async function duplicatePlaylist(id: number): Promise<number> {
    const playlist = await storage.getPlaylist(id);
    if (!playlist) throw new Error('Playlist not found');
    const sentences = await storage.getSentencesByPlaylist(id);

    const newId = await storage.createPlaylist(
      `${playlist.name} (Copy)`,
      playlist.targetLang,
      playlist.nativeLang,
      playlist.icon,
      playlist.description
    );

    for (const sentence of sentences) {
      await addSentence(newId, {
        targetText: sentence.targetText,
        nativeText: sentence.nativeText,
        memo: sentence.memo || '',
        customAudio: sentence.customAudio
      });
    }

    if (playlist.settings) {
      await storage.updatePlaylist(newId, { settings: playlist.settings });
    }

    await loadPlaylists();
    return newId;
  }

  async function mergePlaylists(
    targetPlaylistId: number,
    sourcePlaylistId: number
  ): Promise<number> {
    const sourceSentences = await storage.getSentencesByPlaylist(sourcePlaylistId);
    const targetSentences = await storage.getSentencesByPlaylist(targetPlaylistId);

    let addedCount = 0;
    for (const sourceSentence of sourceSentences) {
      const isDuplicate = targetSentences.some(
        (targetSentence) =>
          targetSentence.targetText.toLowerCase().trim() ===
            sourceSentence.targetText.toLowerCase().trim() &&
          targetSentence.nativeText.toLowerCase().trim() ===
            sourceSentence.nativeText.toLowerCase().trim()
      );

      if (!isDuplicate) {
        await addSentence(targetPlaylistId, {
          targetText: sourceSentence.targetText,
          nativeText: sourceSentence.nativeText,
          memo: sourceSentence.memo || '',
          customAudio: sourceSentence.customAudio
        });
        addedCount++;
      }
    }

    await deletePlaylist(sourcePlaylistId);
    return addedCount;
  }

  async function loadPlaylist(id: number): Promise<Sentence[]> {
    currentPlaylistId.value = id;
    currentSentences.value = await storage.getSentencesByPlaylist(id);

    const playlist = await storage.getPlaylist(id);
    if (playlist) {
      audioEngine.currentPlaylistLang = playlist.targetLang || 'en-US';
      if (playlist.settings) {
        audioEngine.setPlaybackSettings(
          playlist.settings.repeatCount,
          playlist.settings.pauseDuration
        );
        audioEngine.speechRate = playlist.settings.speechRate;
        audioEngine.preferredVoiceName = playlist.settings.preferredVoice;
        audioEngine.speakNativeLanguage = playlist.settings.speakNative;
      }
    }

    await storage.updatePlaylist(id, { lastPlayedAt: Date.now() });
    return currentSentences.value;
  }

  async function addSentence(playlistId: number, sentenceData: SentenceInput): Promise<number> {
    const sentences = await storage.getSentencesByPlaylist(playlistId);
    const order =
      sentences.length > 0
        ? Math.max(...sentences.map((s) => (s.order !== undefined ? s.order : (s.id ?? 0)))) + 1
        : 0;

    const playlist = await storage.getPlaylist(playlistId);
    if (!playlist) throw new Error('Playlist not found');

    const sentence: Sentence = {
      playlistId,
      targetText: sentenceData.targetText,
      nativeText: sentenceData.nativeText,
      memo: sentenceData.memo || '',
      targetLang: playlist.targetLang,
      nativeLang: playlist.nativeLang,
      customAudio: sentenceData.customAudio || null,
      speechRate: sentenceData.speechRate !== undefined ? sentenceData.speechRate : null,
      order
    };

    const id = await storage.createSentence(sentence);

    if (currentPlaylistId.value === playlistId) {
      currentSentences.value = await storage.getSentencesByPlaylist(playlistId);
    }

    return id;
  }

  async function updateSentence(id: number, updates: Partial<Sentence>): Promise<void> {
    await storage.updateSentence(id, updates);
    if (currentPlaylistId.value) {
      currentSentences.value = await storage.getSentencesByPlaylist(currentPlaylistId.value);
    }
  }

  async function deleteSentence(id: number): Promise<void> {
    await storage.deleteSentence(id);
    if (currentPlaylistId.value) {
      currentSentences.value = await storage.getSentencesByPlaylist(currentPlaylistId.value);
      await reorderSentences(currentSentences.value.map((s) => s.id as number));
    }
  }

  async function reorderSentences(sentenceIds: number[]): Promise<void> {
    await Promise.all(sentenceIds.map((id, index) => storage.updateSentence(id, { order: index })));
    if (currentPlaylistId.value) {
      currentSentences.value = await storage.getSentencesByPlaylist(currentPlaylistId.value);
    }
  }

  async function getSentenceCount(playlistId: number): Promise<number> {
    const sentences = await storage.getSentencesByPlaylist(playlistId);
    return sentences.length;
  }

  async function changePlaylistLanguage(
    playlistId: number,
    newTargetLang: string,
    autoTranslate = false
  ): Promise<boolean> {
    const playlist = await storage.getPlaylist(playlistId);
    if (!playlist) throw new Error('Playlist not found');
    const sentences = await storage.getSentencesByPlaylist(playlistId);

    await storage.updatePlaylist(playlistId, {
      targetLang: newTargetLang,
      settings: { ...playlist.settings, preferredVoice: '' }
    });

    if (autoTranslate && sentences.length > 0) {
      for (const sentence of sentences) {
        try {
          const translatedText = await translationService.translate(
            sentence.nativeText,
            playlist.nativeLang,
            newTargetLang
          );
          await updateSentence(sentence.id as number, {
            targetText: translatedText,
            targetLang: newTargetLang
          });
        } catch (error) {
          console.error(`Failed to translate sentence ${sentence.id}:`, error);
        }
      }
    } else {
      for (const sentence of sentences) {
        await updateSentence(sentence.id as number, { targetLang: newTargetLang });
      }
    }

    await loadPlaylists();
    return true;
  }

  async function exportPlaylist(playlistId: number): Promise<void> {
    const exportData = await storage.exportPlaylist(playlistId);
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const playlist = await storage.getPlaylist(playlistId);
    const filename = `${(playlist?.name || 'playlist').replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  async function exportPlaylistAsText(playlistId: number): Promise<void> {
    const playlist = await storage.getPlaylist(playlistId);
    if (!playlist) throw new Error('Playlist not found');
    const sentences = await storage.getSentencesByPlaylist(playlistId);

    // Format: Target\nNative\n# memo (one pair per sentence, no blank lines)
    const textLines: string[] = [];
    for (const sentence of sentences) {
      textLines.push(sentence.targetText);
      textLines.push(sentence.nativeText);
      if (sentence.memo && sentence.memo.trim()) {
        textLines.push(`# ${sentence.memo.trim()}`);
      }
    }

    const text = textLines.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const filename = `${playlist.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.txt`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  async function importFromText(
    file: File,
    targetLang: string,
    nativeLang: string
  ): Promise<number> {
    const text = await file.text();
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line);

    if (lines.length === 0 || lines.length % 2 !== 0) {
      throw new Error('Invalid text format. Each sentence pair must have target and native text.');
    }

    const playlistName = file.name.replace(/\.txt$/i, '');
    const playlistId = await createPlaylist(playlistName, targetLang, nativeLang);

    for (let i = 0; i < lines.length; i += 2) {
      await addSentence(playlistId, {
        targetText: lines[i],
        nativeText: lines[i + 1]
      });
    }

    return playlistId;
  }

  async function importPlaylist(file: File, autoTranslate = false): Promise<number> {
    const text = await file.text();
    const data = JSON.parse(text) as ExportPlaylist;

    if (autoTranslate && data.sentences) {
      const needsTranslation = data.sentences.some((s) => !s.nativeText || !s.nativeText.trim());
      if (needsTranslation) {
        data.sentences = await translationService.translateBatch(
          data.sentences,
          data.playlist.targetLang,
          data.playlist.nativeLang
        );
      }
    }

    const playlistId = await storage.importPlaylist(data);
    await loadPlaylists();
    return playlistId;
  }

  return {
    playlists,
    currentPlaylistId,
    currentSentences,
    loading,
    loadPlaylists,
    reorderPlaylists,
    createPlaylist,
    getPlaylist,
    updatePlaylist,
    renamePlaylist,
    deletePlaylist,
    duplicatePlaylist,
    mergePlaylists,
    loadPlaylist,
    addSentence,
    updateSentence,
    deleteSentence,
    reorderSentences,
    getSentenceCount,
    changePlaylistLanguage,
    exportPlaylist,
    exportPlaylistAsText,
    importPlaylist,
    importFromText
  };
});
