import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { audioEngine } from '@/services/audio';
import type { Sentence } from '@/types/models';
import { usePlaylistsStore } from './playlists';

export const usePlayerStore = defineStore('player', () => {
  const playlistsStore = usePlaylistsStore();

  const currentPlaylistId = ref<number | null>(null);
  const sentences = ref<Sentence[]>([]);
  const currentIndex = ref(0);
  const isPlaying = ref(false);
  const isPaused = ref(false);
  const shuffleMode = ref(false);
  const sleepTimerMinutes = ref(0);

  const currentSentence = computed(() => sentences.value[currentIndex.value] || null);
  const progress = computed(() => ({
    current: currentIndex.value + 1,
    total: sentences.value.length
  }));

  // Keep reactive state in sync with the audio engine.
  audioEngine.on('playbackStateChange', (data) => {
    const d = data as { isPlaying: boolean; isPaused: boolean };
    isPlaying.value = d.isPlaying;
    isPaused.value = d.isPaused;
  });

  audioEngine.on('sentenceChange', (data) => {
    const d = data as { index: number };
    currentIndex.value = d.index;
  });

  async function openPlaylist(id: number): Promise<void> {
    currentPlaylistId.value = id;
    const loaded = await playlistsStore.loadPlaylist(id);
    sentences.value = loaded;
    audioEngine.loadPlaylist(loaded);
    currentIndex.value = 0;
  }

  function play(): void {
    audioEngine.play();
  }

  function pause(): void {
    audioEngine.pause();
  }

  function stop(): void {
    audioEngine.stop();
  }

  function next(): void {
    audioEngine.next();
  }

  function previous(): void {
    audioEngine.previous();
  }

  function togglePlayPause(): void {
    if (audioEngine.isPlaying) {
      audioEngine.pause();
    } else {
      audioEngine.play();
    }
  }

  function jumpToSentence(index: number): void {
    audioEngine.jumpToSentence(index);
  }

  function toggleShuffle(): boolean {
    shuffleMode.value = audioEngine.toggleShuffle();
    return shuffleMode.value;
  }

  function setSleepTimer(minutes: number): void {
    sleepTimerMinutes.value = minutes;
    audioEngine.setSleepTimer(minutes);
  }

  function clearSleepTimer(): void {
    sleepTimerMinutes.value = 0;
    audioEngine.clearSleepTimer();
  }

  function getSleepTimerRemaining(): number {
    return audioEngine.getSleepTimerRemaining();
  }

  function getSleepTimerRemainingSeconds(): number {
    return audioEngine.getSleepTimerRemainingSeconds();
  }

  return {
    currentPlaylistId,
    sentences,
    currentIndex,
    isPlaying,
    isPaused,
    shuffleMode,
    sleepTimerMinutes,
    currentSentence,
    progress,
    openPlaylist,
    play,
    pause,
    stop,
    next,
    previous,
    togglePlayPause,
    jumpToSentence,
    toggleShuffle,
    setSleepTimer,
    clearSleepTimer,
    getSleepTimerRemaining,
    getSleepTimerRemainingSeconds
  };
});
