import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const { mockAudio, mockStorage } = vi.hoisted(() => ({
  mockAudio: {
    isPlaying: false,
    currentIndex: 0,
    shuffleMode: false,
    on: vi.fn(),
    loadPlaylist: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    next: vi.fn(),
    previous: vi.fn(),
    jumpToSentence: vi.fn(),
    toggleShuffle: vi.fn(() => true),
    setSleepTimer: vi.fn(),
    clearSleepTimer: vi.fn(),
    getSleepTimerRemaining: vi.fn(() => 0)
  },
  mockStorage: {
    getSentencesByPlaylist: vi.fn().mockResolvedValue([]),
    getPlaylist: vi.fn().mockResolvedValue({
      targetLang: 'en-US',
      settings: {
        repeatCount: 2,
        pauseDuration: 1,
        speechRate: 1,
        preferredVoice: '',
        speakNative: false
      }
    }),
    updatePlaylist: vi.fn()
  }
}));

vi.mock('@/services/audio', () => ({ audioEngine: mockAudio }));
vi.mock('@/services/storage', () => ({ storage: mockStorage }));

import { usePlayerStore } from '@/stores/player';

describe('player store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('toggles shuffle', () => {
    const store = usePlayerStore();
    expect(store.toggleShuffle()).toBe(true);
    expect(store.shuffleMode).toBe(true);
  });

  it('sets and clears the sleep timer', () => {
    const store = usePlayerStore();
    store.setSleepTimer(15);
    expect(store.sleepTimerMinutes).toBe(15);
    store.clearSleepTimer();
    expect(store.sleepTimerMinutes).toBe(0);
  });

  it('computes progress from the current index', () => {
    const store = usePlayerStore();
    store.sentences = [
      { id: 1, targetText: 'a', nativeText: 'b' },
      { id: 2, targetText: 'c', nativeText: 'd' }
    ] as never;
    store.currentIndex = 1;
    expect(store.progress).toEqual({ current: 2, total: 2 });
  });
});
