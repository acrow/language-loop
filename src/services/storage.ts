import { getDB } from './db';
import { DEFAULT_PLAYLIST_SETTINGS } from '@/constants';
import { sortSentencesByOrder } from '@/lib/logic';
import type {
  BackupData,
  BackupSentence,
  ExportPlaylist,
  ExportSentence,
  Group,
  Playlist,
  Sentence,
  SettingRecord
} from '@/types/models';

export interface PlaylistChangeEvent {
  playlistId: number;
  cloudId?: string;
  deleted?: boolean;
}

export interface GroupChangeEvent {
  groupId: number;
  deleted?: boolean;
}

// Typed IndexedDB storage service.
// Ported from the legacy `js/storage.js` with the same schema and behavior.
export class StorageService {
  private playlistChangeListeners = new Set<(event: PlaylistChangeEvent) => void>();
  private groupChangeListeners = new Set<(event: GroupChangeEvent) => void>();

  generateId(): string {
    return 'playlist_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
  }

  onPlaylistChange(listener: (event: PlaylistChangeEvent) => void): void {
    this.playlistChangeListeners.add(listener);
  }

  offPlaylistChange(listener: (event: PlaylistChangeEvent) => void): void {
    this.playlistChangeListeners.delete(listener);
  }

  private notifyPlaylistChange(event: PlaylistChangeEvent): void {
    this.playlistChangeListeners.forEach((listener) => listener(event));
  }

  onGroupChange(listener: (event: GroupChangeEvent) => void): void {
    this.groupChangeListeners.add(listener);
  }

  offGroupChange(listener: (event: GroupChangeEvent) => void): void {
    this.groupChangeListeners.delete(listener);
  }

  private notifyGroupChange(event: GroupChangeEvent): void {
    this.groupChangeListeners.forEach((listener) => listener(event));
  }

  // ---------------------------------------------------------------
  // Playlist operations
  // ---------------------------------------------------------------
  async createPlaylist(
    name: string,
    targetLang = 'en-US',
    nativeLang = 'zh-CN',
    icon = '📖',
    description = '',
    groupId: number | null = null
  ): Promise<number> {
    const db = await getDB();
    const playlist: Playlist = {
      cloudId: this.generateId(),
      version: 1,
      name,
      icon,
      description,
      targetLang,
      nativeLang,
      groupId: groupId || null,
      createdAt: Date.now(),
      lastPlayedAt: null,
      settings: { ...DEFAULT_PLAYLIST_SETTINGS }
    };
    const id = (await db.add('playlists', playlist)) as number;
    this.notifyPlaylistChange({ playlistId: id });
    return id;
  }

  async getAllPlaylists(): Promise<Playlist[]> {
    const db = await getDB();
    return db.getAll('playlists');
  }

  async getPlaylist(id: number): Promise<Playlist | undefined> {
    const db = await getDB();
    return db.get('playlists', id);
  }

  async updatePlaylist(id: number, updates: Partial<Playlist>): Promise<number> {
    const db = await getDB();
    const playlist = await db.get('playlists', id);
    if (!playlist) throw new Error(`Playlist ${id} not found`);

    const updated: Playlist = { ...playlist, ...updates };
    // Auto-increment version unless the caller explicitly sets it.
    if (updates.version === undefined) {
      updated.version = (updated.version || 1) + 1;
    }
    await db.put('playlists', updated);
    this.notifyPlaylistChange({ playlistId: id });
    return updated.id as number;
  }

  async deletePlaylist(id: number): Promise<void> {
    const playlist = await this.getPlaylist(id);
    await this.deleteSentencesByPlaylist(id);
    const db = await getDB();
    await db.delete('playlists', id);
    this.notifyPlaylistChange({ playlistId: id, cloudId: playlist?.cloudId, deleted: true });
  }

  // Wipe every local record. Used by the "Initialize system" action.
  async resetAll(): Promise<void> {
    const db = await getDB();
    await db.clear('sentences');
    await db.clear('playlists');
    await db.clear('groups');
    await db.clear('settings');
  }

  // ---------------------------------------------------------------
  // Sentence operations
  // ---------------------------------------------------------------
  async createSentence(sentence: Sentence): Promise<number> {
    const db = await getDB();
    const record: Sentence = {
      ...sentence,
      successCount: sentence.successCount ?? 0
    };
    const id = (await db.add('sentences', record)) as number;
    this.notifyPlaylistChange({ playlistId: sentence.playlistId });
    return id;
  }

  async getSentencesByPlaylist(playlistId: number): Promise<Sentence[]> {
    const db = await getDB();
    const sentences = await db.getAllFromIndex('sentences', 'playlistId', playlistId);
    return sortSentencesByOrder(sentences);
  }

  async updateSentence(id: number, updates: Partial<Sentence>): Promise<number> {
    const db = await getDB();
    const sentence = await db.get('sentences', id);
    if (!sentence) throw new Error(`Sentence ${id} not found`);

    const updated: Sentence = { ...sentence, ...updates };
    await db.put('sentences', updated);
    await this.incrementPlaylistVersion(sentence.playlistId);
    this.notifyPlaylistChange({ playlistId: sentence.playlistId });
    return updated.id as number;
  }

  async incrementPlaylistVersion(id: number): Promise<void> {
    try {
      await this.updatePlaylist(id, {});
    } catch {
      // Ignore if the playlist was deleted.
    }
  }

  async deleteSentence(id: number): Promise<void> {
    const db = await getDB();
    const sentence = await db.get('sentences', id);
    await db.delete('sentences', id);
    if (sentence) {
      await this.incrementPlaylistVersion(sentence.playlistId);
      this.notifyPlaylistChange({ playlistId: sentence.playlistId });
    }
  }

  async deleteSentencesByPlaylist(playlistId: number): Promise<void> {
    const sentences = await this.getSentencesByPlaylist(playlistId);
    const db = await getDB();
    const tx = db.transaction('sentences', 'readwrite');
    await Promise.all(sentences.map((s) => tx.store.delete(s.id as number)));
    await tx.done;
  }

  // ---------------------------------------------------------------
  // Settings operations
  // ---------------------------------------------------------------
  async getSetting<T = unknown>(key: string, defaultValue: T | null = null): Promise<T | null> {
    const db = await getDB();
    const record = await db.get('settings', key);
    return record ? (record.value as T) : defaultValue;
  }

  async setSetting<T = unknown>(key: string, value: T): Promise<void> {
    const db = await getDB();
    await db.put('settings', { key, value });
  }

  async deleteSetting(key: string): Promise<void> {
    const db = await getDB();
    await db.delete('settings', key);
  }

  async getAllSettings(): Promise<SettingRecord[]> {
    const db = await getDB();
    return db.getAll('settings');
  }

  // ---------------------------------------------------------------
  // Playlist / group ordering
  // ---------------------------------------------------------------
  async savePlaylistOrder(orderedIds: number[]): Promise<void> {
    return this.setSetting('playlistOrder', orderedIds);
  }

  async getPlaylistOrder(): Promise<number[] | null> {
    return this.getSetting<number[]>('playlistOrder', null);
  }

  async saveGroupOrder(orderedGroupIds: number[]): Promise<void> {
    return this.setSetting('groupOrder', orderedGroupIds);
  }

  async getGroupOrder(): Promise<number[] | null> {
    return this.getSetting<number[]>('groupOrder', null);
  }

  // ---------------------------------------------------------------
  // Group operations
  // ---------------------------------------------------------------
  async createGroup(name: string, icon = '📁', color: string | null = null): Promise<number> {
    const db = await getDB();
    const allGroups = await this.getAllGroups();
    const group: Group = {
      cloudId: 'group_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11),
      name,
      icon,
      color,
      order: allGroups.length,
      collapsed: false,
      createdAt: Date.now()
    };
    const id = (await db.add('groups', group)) as number;
    this.notifyGroupChange({ groupId: id });
    return id;
  }

  async getAllGroups(): Promise<Group[]> {
    const db = await getDB();
    return db.getAll('groups');
  }

  async getGroup(id: number): Promise<Group | undefined> {
    const db = await getDB();
    return db.get('groups', id);
  }

  async updateGroup(id: number, updates: Partial<Group>): Promise<number> {
    const db = await getDB();
    const group = await db.get('groups', id);
    if (!group) throw new Error(`Group ${id} not found`);

    const updated: Group = { ...group, ...updates };
    await db.put('groups', updated);
    this.notifyGroupChange({ groupId: id });
    return updated.id as number;
  }

  async deleteGroup(id: number): Promise<void> {
    const db = await getDB();
    await db.delete('groups', id);
    this.notifyGroupChange({ groupId: id, deleted: true });
  }

  // ---------------------------------------------------------------
  // Export / import
  // ---------------------------------------------------------------
  async exportPlaylist(playlistId: number): Promise<ExportPlaylist> {
    const playlist = await this.getPlaylist(playlistId);
    if (!playlist) throw new Error(`Playlist ${playlistId} not found`);
    const sentences = await this.getSentencesByPlaylist(playlistId);

    const sentencesWithAudio: ExportSentence[] = await Promise.all(
      sentences.map(async (sentence) => {
        const customAudio = sentence.customAudio
          ? await this.blobToBase64(sentence.customAudio)
          : null;
        return {
          targetText: sentence.targetText,
          nativeText: sentence.nativeText,
          memo: sentence.memo || '',
          targetLang: sentence.targetLang,
          nativeLang: sentence.nativeLang,
          customAudio,
          speechRate: sentence.speechRate !== undefined ? sentence.speechRate : null,
          disabled: sentence.disabled || false,
          order: sentence.order
        };
      })
    );

    let groupCloudId: string | null = null;
    let groupName: string | null = null;
    let groupIcon: string | null = null;
    let groupColor: string | null = null;
    let groupOrder: number | null = null;
    if (playlist.groupId) {
      const group = await this.getGroup(playlist.groupId);
      if (group) {
        // Backfill a stable cloud ID for groups created before cloud sync.
        if (!group.cloudId) {
          group.cloudId = 'group_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
          await this.updateGroup(group.id as number, { cloudId: group.cloudId });
        }
        groupCloudId = group.cloudId;
        groupName = group.name;
        groupIcon = group.icon;
        groupColor = group.color ?? null;
        groupOrder = group.order;
      }
    }

    return {
      version: playlist.version || 1,
      playlist: {
        cloudId: playlist.cloudId || this.generateId(),
        name: playlist.name,
        targetLang: playlist.targetLang,
        nativeLang: playlist.nativeLang,
        icon: playlist.icon,
        description: playlist.description,
        createdAt: playlist.createdAt,
        groupCloudId,
        groupName,
        groupIcon,
        groupColor,
        groupOrder
      },
      sentences: sentencesWithAudio
    };
  }

  async importPlaylist(jsonData: string | ExportPlaylist): Promise<number> {
    const data: ExportPlaylist = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    const cloudId = data.playlist.cloudId;
    const groupCloudId = data.playlist.groupCloudId || null;
    let groupId: number | null = null;
    if (groupCloudId) {
      const groups = await this.getAllGroups();
      const group = groups.find((g) => g.cloudId === groupCloudId);
      if (group) groupId = group.id as number;
    }
    const allPlaylists = await this.getAllPlaylists();
    const existingPlaylist = cloudId ? allPlaylists.find((p) => p.cloudId === cloudId) : undefined;
    let playlistId: number;

    if (existingPlaylist) {
      playlistId = existingPlaylist.id as number;
      await this.updatePlaylist(playlistId, {
        version: data.version || 1,
        name: data.playlist.name,
        targetLang: data.playlist.targetLang,
        nativeLang: data.playlist.nativeLang,
        icon: data.playlist.icon,
        description: data.playlist.description,
        groupId
      });
      await this.deleteSentencesByPlaylist(playlistId);
    } else {
      playlistId = await this.createPlaylist(
        data.playlist.name,
        data.playlist.targetLang,
        data.playlist.nativeLang,
        data.playlist.icon,
        data.playlist.description
      );
      await this.updatePlaylist(playlistId, {
        cloudId: cloudId || this.generateId(),
        version: data.version || 1,
        groupId
      });
    }

    await Promise.all(
      data.sentences.map(async (sentence, index) => {
        const customAudio =
          typeof sentence.customAudio === 'string'
            ? await this.base64ToBlob(sentence.customAudio)
            : null;
        return this.createSentence({
          playlistId,
          targetText: sentence.targetText,
          nativeText: sentence.nativeText,
          memo: sentence.memo || '',
          targetLang: sentence.targetLang || data.playlist.targetLang,
          nativeLang: sentence.nativeLang || data.playlist.nativeLang,
          customAudio,
          speechRate: sentence.speechRate !== undefined ? sentence.speechRate : null,
          disabled: sentence.disabled || false,
          successCount: sentence.successCount || 0,
          order: index
        });
      })
    );

    return playlistId;
  }

  async exportAll(): Promise<BackupData> {
    const playlists = await this.getAllPlaylists();
    const groups = await this.getAllGroups();
    const settings = await this.getAllSettings();

    const sentences: BackupSentence[] = [];
    for (const playlist of playlists) {
      const list = await this.getSentencesByPlaylist(playlist.id as number);
      for (const sentence of list) {
        if (sentence.customAudio) {
          const base64 = await this.blobToBase64(sentence.customAudio);
          sentences.push({ ...sentence, customAudio: base64 });
        } else {
          sentences.push({ ...sentence, customAudio: null });
        }
      }
    }

    return {
      format: 'language-loop-backup',
      version: 1,
      exportedAt: Date.now(),
      playlists,
      sentences,
      groups,
      settings
    };
  }

  async importAll(
    data: BackupData
  ): Promise<{ playlists: number; sentences: number; groups: number }> {
    if (!data || data.format !== 'language-loop-backup') {
      throw new Error('Invalid backup file. Expected a Language Loop backup.');
    }

    const db = await getDB();
    await db.clear('sentences');
    await db.clear('playlists');
    await db.clear('groups');
    await db.clear('settings');

    for (const setting of data.settings || []) {
      await this.setSetting(setting.key, setting.value);
    }

    for (const group of data.groups || []) {
      await db.put('groups', group);
    }

    for (const playlist of data.playlists || []) {
      await db.put('playlists', playlist);
    }

    for (const sentence of data.sentences || []) {
      let customAudio: Blob | null = null;
      if (typeof sentence.customAudio === 'string') {
        customAudio = await this.base64ToBlob(sentence.customAudio);
      } else if (sentence.customAudio instanceof Blob) {
        customAudio = sentence.customAudio;
      }
      await db.put('sentences', { ...sentence, customAudio });
    }

    return {
      playlists: (data.playlists || []).length,
      sentences: (data.sentences || []).length,
      groups: (data.groups || []).length
    };
  }

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------
  blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  base64ToBlob(base64: string): Promise<Blob> {
    return fetch(base64).then((res) => res.blob());
  }

  // Ensure all playlists have settings/cloudId/version and sentences have successCount.
  async migratePlaylistSettings(): Promise<void> {
    const playlists = await this.getAllPlaylists();
    const defaultSettings = { ...DEFAULT_PLAYLIST_SETTINGS };

    for (const playlist of playlists) {
      const updates: Partial<Playlist> = {};
      if (!playlist.settings) {
        updates.settings = defaultSettings;
      }
      if (!playlist.cloudId) {
        updates.cloudId = this.generateId();
        updates.version = 1;
      }
      if (Object.keys(updates).length > 0) {
        await this.updatePlaylist(playlist.id as number, updates);
      }

      const sentences = await this.getSentencesByPlaylist(playlist.id as number);
      for (const sentence of sentences) {
        if (sentence.successCount === undefined) {
          await this.updateSentence(sentence.id as number, { successCount: 0 });
        }
      }
    }
  }
}

export const storage = new StorageService();
