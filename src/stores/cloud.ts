import { defineStore } from 'pinia';
import { ref } from 'vue';
import { storage, type PlaylistChangeEvent } from '@/services/storage';
import { usePlaylistsStore } from './playlists';
import { useGroupsStore } from './groups';
import type { CloudGroupListItem, CloudPlaylistListItem } from '@/types/cloud';
import type { ExportPlaylist } from '@/types/models';

export interface CloudUser {
  uid: string;
  displayName: string | null;
  email: string | null;
}

export interface LocalPlaylistSummary {
  id: number;
  name: string;
  icon: string;
  version: number;
  groupId: number | null;
}

export interface LocalGroupSummary {
  id: number;
  cloudId: string;
  name: string;
  icon: string;
}

type CloudModule = typeof import('@/services/cloud');

export const useCloudStore = defineStore('cloud', () => {
  const playlistsStore = usePlaylistsStore();
  const groupsStore = useGroupsStore();

  const user = ref<CloudUser | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const cloudPlaylists = ref<CloudPlaylistListItem[]>([]);
  const cloudGroups = ref<CloudGroupListItem[]>([]);
  const localPlaylists = ref<LocalPlaylistSummary[]>([]);
  const localGroups = ref<LocalGroupSummary[]>([]);
  const autoSync = ref(false);
  const syncing = ref(false);

  let modulePromise: Promise<CloudModule> | null = null;
  let authBound = false;
  let syncTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingSync = new Set<number>();

  // Lazily load the Firebase module and bind auth state once.
  async function ensureService() {
    if (!modulePromise) {
      modulePromise = import('@/services/cloud');
    }
    const mod = await modulePromise;

    if (!authBound) {
      authBound = true;
      mod.cloudService.onAuthChange((u) => {
        user.value = u ? { uid: u.uid, displayName: u.displayName, email: u.email } : null;
        if (u) {
          void loadLocal().catch((e) => console.error('loadLocal failed:', e));
          void loadCloud().catch((e) => console.error('loadCloud failed:', e));
        }
      });
    }

    return mod.cloudService;
  }

  async function signIn(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const service = await ensureService();
      await service.signIn();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Sign in failed';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function signOut(): Promise<void> {
    const service = await ensureService();
    await service.signOut();
    user.value = null;
    cloudPlaylists.value = [];
  }

  async function loadLocal(): Promise<void> {
    try {
      const [all, groups] = await Promise.all([
        storage.getAllPlaylists(),
        storage.getAllGroups()
      ]);
      localPlaylists.value = all.map((p) => ({
        id: p.id as number,
        name: p.name,
        icon: p.icon,
        version: p.version,
        groupId: p.groupId ?? null
      }));
      localGroups.value = groups.map((g) => ({
        id: g.id as number,
        cloudId: g.cloudId ?? '',
        name: g.name,
        icon: g.icon
      }));
    } catch (e) {
      console.error('loadLocal failed:', e);
    }
  }

  async function loadCloud(): Promise<void> {
    const service = await ensureService();
    if (!service.getCurrentUser()) return;
    try {
      const playlists = await service.listPlaylists();
      cloudPlaylists.value = playlists;

      // Derive groups from the metadata embedded in each playlist document.
      // This avoids needing a separate Firestore collection and rules.
      const map = new Map<string, CloudGroupListItem>();
      for (const p of playlists) {
        const gid = p.playlist?.groupCloudId;
        if (gid && !map.has(gid)) {
          map.set(gid, {
            docId: gid,
            cloudId: gid,
            name: p.playlist?.groupName || '',
            icon: p.playlist?.groupIcon || '📁',
            color: p.playlist?.groupColor ?? null,
            order: p.playlist?.groupOrder ?? 0,
            createdAt: 0,
            uploadedAt: p.uploadedAt,
            uploadedBy: p.uploadedBy
          });
        }
      }
      cloudGroups.value = [...map.values()];
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load cloud data';
      console.error('loadCloud failed:', e);
    }
  }

  async function uploadPlaylist(playlistId: number): Promise<void> {
    const service = await ensureService();
    const exportData = await storage.exportPlaylist(playlistId);
    await service.uploadPlaylist(exportData);
    await loadCloud();
  }

  async function loadAutoSync(): Promise<void> {
    autoSync.value = (await storage.getSetting<boolean>('cloudAutoSync', false)) ?? false;
  }

  async function setAutoSync(enabled: boolean): Promise<void> {
    autoSync.value = enabled;
    await storage.setSetting('cloudAutoSync', enabled);
  }

  function scheduleSync(playlistId: number): void {
    if (!autoSync.value || !user.value || syncing.value) return;
    pendingSync.add(playlistId);
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      void flushSync();
    }, 1000);
  }

  async function flushSync(): Promise<void> {
    if (syncing.value || !autoSync.value || !user.value) return;
    syncing.value = true;
    try {
      const ids = [...pendingSync];
      pendingSync.clear();
      for (const id of ids) {
        const playlist = await storage.getPlaylist(id);
        if (playlist) {
          await uploadPlaylist(id);
        }
      }
    } catch (e) {
      console.error('Auto-sync failed:', e);
    } finally {
      syncing.value = false;
    }
  }

  async function handlePlaylistChange(event: PlaylistChangeEvent): Promise<void> {
    if (!autoSync.value || !user.value || syncing.value) return;

    try {
      if (event.deleted) {
        if (!event.cloudId) return;
        await loadCloud();
        const doc = cloudPlaylists.value.find((d) => d.playlist?.cloudId === event.cloudId);
        if (doc) await deletePlaylist(doc.docId);
        return;
      }

      scheduleSync(event.playlistId);
    } catch (e) {
      console.error('Auto-sync change handling failed:', e);
    }
  }

  async function uploadAll(): Promise<void> {
    const service = await ensureService();
    const all = await storage.getAllPlaylists();
    for (const p of all) {
      const exportData = await storage.exportPlaylist(p.id as number);
      await service.uploadPlaylist(exportData);
    }
    await loadCloud();
  }

  async function ensureLocalGroup(
    cloudId: string,
    name: string,
    icon: string,
    color: string | null,
    order: number
  ): Promise<number | null> {
    const groups = await storage.getAllGroups();
    const existing = groups.find((g) => g.cloudId === cloudId);
    if (existing) return existing.id as number;

    const id = await storage.createGroup(name || 'Imported Group', icon || '📁', color);
    await storage.updateGroup(id, { cloudId, order });
    return id;
  }

  async function downloadPlaylist(docId: string): Promise<void> {
    const service = await ensureService();
    const cloudData = await service.getPlaylist(docId);
    syncing.value = true;
    try {
      if (cloudData.playlist.groupCloudId) {
        await ensureLocalGroup(
          cloudData.playlist.groupCloudId,
          cloudData.playlist.groupName || '',
          cloudData.playlist.groupIcon || '📁',
          cloudData.playlist.groupColor ?? null,
          cloudData.playlist.groupOrder ?? 0
        );
      }
      await storage.importPlaylist(cloudData as unknown as ExportPlaylist);
    } finally {
      syncing.value = false;
    }
    await playlistsStore.loadPlaylists();
    await groupsStore.loadGroups();
    await loadLocal();
  }

  async function downloadAll(): Promise<void> {
    const service = await ensureService();
    syncing.value = true;
    try {
      for (const d of cloudPlaylists.value) {
        const cloudData = await service.getPlaylist(d.docId);
        if (cloudData.playlist.groupCloudId) {
          await ensureLocalGroup(
            cloudData.playlist.groupCloudId,
            cloudData.playlist.groupName || '',
            cloudData.playlist.groupIcon || '📁',
            cloudData.playlist.groupColor ?? null,
            cloudData.playlist.groupOrder ?? 0
          );
        }
        await storage.importPlaylist(cloudData as unknown as ExportPlaylist);
      }
    } finally {
      syncing.value = false;
    }
    await playlistsStore.loadPlaylists();
    await groupsStore.loadGroups();
    await loadLocal();
  }

  async function deletePlaylist(docId: string): Promise<void> {
    const service = await ensureService();
    await service.deletePlaylist(docId);
    await loadCloud();
  }

  // Register the auto-sync listener once and restore the saved preference.
  storage.onPlaylistChange((event) => {
    void handlePlaylistChange(event);
  });
  void loadAutoSync();

  return {
    user,
    loading,
    error,
    cloudPlaylists,
    cloudGroups,
    localPlaylists,
    localGroups,
    autoSync,
    syncing,
    ensureService,
    setAutoSync,
    signIn,
    signOut,
    loadLocal,
    loadCloud,
    uploadPlaylist,
    uploadAll,
    downloadPlaylist,
    downloadAll,
    deletePlaylist
  };
});
