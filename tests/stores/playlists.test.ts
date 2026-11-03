import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const { mockStorage, mockAudio } = vi.hoisted(() => ({
  mockStorage: {
    getAllPlaylists: vi.fn(),
    getPlaylistOrder: vi.fn().mockResolvedValue(null),
    savePlaylistOrder: vi.fn(),
    createPlaylist: vi.fn(),
    getPlaylist: vi.fn(),
    updatePlaylist: vi.fn(),
    deletePlaylist: vi.fn(),
    getSentencesByPlaylist: vi.fn(),
    createSentence: vi.fn(),
    updateSentence: vi.fn(),
    deleteSentence: vi.fn(),
    exportPlaylist: vi.fn(),
    importPlaylist: vi.fn()
  },
  mockAudio: {
    currentPlaylistLang: '',
    speechRate: 1,
    preferredVoiceName: '',
    speakNativeLanguage: false,
    setPlaybackSettings: vi.fn(),
    loadPlaylist: vi.fn()
  }
}));

vi.mock('@/services/storage', () => ({ storage: mockStorage }));
vi.mock('@/services/audio', () => ({ audioEngine: mockAudio }));
vi.mock('@/services/translation', () => ({
  translationService: { translate: vi.fn(), translateBatch: vi.fn() }
}));

import { usePlaylistsStore } from '@/stores/playlists';

describe('playlists store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('loads playlists', async () => {
    mockStorage.getAllPlaylists.mockResolvedValue([{ id: 1, name: 'A' }]);
    const store = usePlaylistsStore();
    await store.loadPlaylists();
    expect(store.playlists).toHaveLength(1);
  });

  it('creates a playlist and reloads', async () => {
    mockStorage.createPlaylist.mockResolvedValue(5);
    mockStorage.getAllPlaylists.mockResolvedValue([{ id: 5, name: 'New' }]);
    const store = usePlaylistsStore();
    const id = await store.createPlaylist('New', 'en-US', 'zh-CN');
    expect(id).toBe(5);
    expect(store.playlists).toHaveLength(1);
  });

  it('rejects empty playlist names', async () => {
    const store = usePlaylistsStore();
    await expect(store.createPlaylist('', 'en-US', 'zh-CN')).rejects.toThrow();
  });

  it('deletes a playlist and clears the current one', async () => {
    mockStorage.deletePlaylist.mockResolvedValue(undefined);
    mockStorage.getAllPlaylists.mockResolvedValue([]);
    const store = usePlaylistsStore();
    store.currentPlaylistId = 3;
    await store.deletePlaylist(3);
    expect(store.currentPlaylistId).toBeNull();
  });
});
