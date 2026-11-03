import { defineStore } from 'pinia';
import { ref } from 'vue';
import { storage } from '@/services/storage';
import type { CombinedOrderEntry, Group } from '@/types/models';

export const useGroupsStore = defineStore('groups', () => {
  const groups = ref<Group[]>([]);
  const combinedOrder = ref<CombinedOrderEntry[]>([]);

  async function loadGroups(): Promise<void> {
    groups.value = await storage.getAllGroups();
  }

  async function createGroup(name: string, icon = '📁'): Promise<number> {
    if (!name || !name.trim()) throw new Error('Group name cannot be empty');
    const id = await storage.createGroup(name.trim(), icon);
    await loadGroups();
    return id;
  }

  async function updateGroup(id: number, updates: Partial<Group>): Promise<void> {
    await storage.updateGroup(id, updates);
    await loadGroups();
  }

  async function deleteGroup(id: number): Promise<void> {
    await storage.deleteGroup(id);
    await loadGroups();
  }

  async function movePlaylistToGroup(playlistId: number, groupId: number | null): Promise<void> {
    await storage.updatePlaylist(playlistId, { groupId: groupId || null });
  }

  async function loadCombinedOrder(): Promise<void> {
    const saved = await storage.getSetting<CombinedOrderEntry[]>('combinedOrder', null);
    combinedOrder.value = saved || [];
  }

  async function saveCombinedOrder(order: CombinedOrderEntry[]): Promise<void> {
    combinedOrder.value = order;
    await storage.setSetting('combinedOrder', order);
  }

  return {
    groups,
    combinedOrder,
    loadGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    movePlaylistToGroup,
    loadCombinedOrder,
    saveCombinedOrder
  };
});
