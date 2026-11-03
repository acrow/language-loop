import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const { mockStorage } = vi.hoisted(() => ({
  mockStorage: {
    getSentencesByPlaylist: vi.fn(),
    updateSentence: vi.fn(),
    getPlaylist: vi.fn()
  }
}));

vi.mock('@/services/storage', () => ({ storage: mockStorage }));
vi.mock('@/services/audio', () => ({
  audioEngine: {
    startSpeechRecognition: vi.fn(),
    stopSpeechRecognition: vi.fn(),
    playTTS: vi.fn(),
    playCustomAudio: vi.fn()
  }
}));

import { useTestStore } from '@/stores/test';

describe('test store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('starts a test with only enabled sentences', async () => {
    mockStorage.getSentencesByPlaylist.mockResolvedValue([
      { id: 1, targetText: 'Hello', nativeText: '你好', disabled: false, order: 0 },
      { id: 2, targetText: 'Bye', nativeText: '再见', disabled: true, order: 1 }
    ]);
    const store = useTestStore();
    const ok = await store.startTest(1, 'writing');
    expect(ok).toBe(true);
    expect(store.sentences).toHaveLength(1);
  });

  it('returns false when there are no enabled sentences', async () => {
    mockStorage.getSentencesByPlaylist.mockResolvedValue([
      { id: 1, targetText: 'Hello', nativeText: '你好', disabled: true, order: 0 }
    ]);
    const store = useTestStore();
    const ok = await store.startTest(1, 'writing');
    expect(ok).toBe(false);
  });

  it('marks a correct answer', async () => {
    mockStorage.getSentencesByPlaylist.mockResolvedValue([
      { id: 1, targetText: 'Hello', nativeText: '你好', disabled: false, order: 0, successCount: 0 }
    ]);
    mockStorage.updateSentence.mockResolvedValue(1);
    const store = useTestStore();
    await store.startTest(1, 'writing');
    const result = await store.checkAnswer('hello');
    expect(result.isCorrect).toBe(true);
    expect(store.correctCount).toBe(1);
  });

  it('marks an incorrect answer', async () => {
    mockStorage.getSentencesByPlaylist.mockResolvedValue([
      { id: 1, targetText: 'Hello', nativeText: '你好', disabled: false, order: 0 }
    ]);
    const store = useTestStore();
    await store.startTest(1, 'writing');
    const result = await store.checkAnswer('goodbye');
    expect(result.isCorrect).toBe(false);
    expect(store.correctCount).toBe(0);
  });
});
