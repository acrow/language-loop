import { ref } from 'vue';
import { audioEngine, type AudioSentence } from '@/services/audio';

// Reactive mirrors of the audio engine state. Listeners are registered once
// at module load so every component shares the same reactive state.
const isPlaying = ref(audioEngine.isPlaying);
const isPaused = ref(audioEngine.isPaused);
const currentIndex = ref(audioEngine.currentIndex);
const currentSentence = ref<AudioSentence | null>(null);
const shuffleMode = ref(audioEngine.shuffleMode);

audioEngine.on('playbackStateChange', (data) => {
  const d = data as { isPlaying: boolean; isPaused: boolean };
  isPlaying.value = d.isPlaying;
  isPaused.value = d.isPaused;
});

audioEngine.on('sentenceChange', (data) => {
  const d = data as { index: number; sentence: AudioSentence };
  currentIndex.value = d.index;
  currentSentence.value = d.sentence;
});

export function useAudio() {
  function toggleShuffle(): boolean {
    shuffleMode.value = audioEngine.toggleShuffle();
    return shuffleMode.value;
  }

  return {
    audioEngine,
    isPlaying,
    isPaused,
    currentIndex,
    currentSentence,
    shuffleMode,
    play: () => audioEngine.play(),
    pause: () => audioEngine.pause(),
    stop: () => audioEngine.stop(),
    next: () => audioEngine.next(),
    previous: () => audioEngine.previous(),
    toggleShuffle,
    loadPlaylist: (sentences: AudioSentence[]) => audioEngine.loadPlaylist(sentences),
    jumpToSentence: (index: number) => audioEngine.jumpToSentence(index),
    setPlaybackSettings: (repeatCount: number, pauseDuration: number) =>
      audioEngine.setPlaybackSettings(repeatCount, pauseDuration),
    setSleepTimer: (minutes: number) => audioEngine.setSleepTimer(minutes),
    clearSleepTimer: () => audioEngine.clearSleepTimer(),
    getSleepTimerRemaining: () => audioEngine.getSleepTimerRemaining()
  };
}
