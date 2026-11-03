<script setup lang="ts">
import { computed } from 'vue';
import type { Group, Playlist } from '@/types/models';
import PlaylistCard from './PlaylistCard.vue';
import GroupCard from './GroupCard.vue';

const props = defineProps<{
  playlists: Playlist[];
  groups: Group[];
  counts: Record<number, number>;
  searchTerm: string;
}>();

const emit = defineEmits<{
  (e: 'edit-group', group: Group): void;
  (e: 'delete-group', group: Group): void;
  (e: 'move-playlist', payload: { playlistId: number; groupId: number | null }): void;
  (e: 'reorder-playlists', payload: { sourceId: number; targetId: number }): void;
  (e: 'edit-playlist', playlist: Playlist): void;
  (e: 'delete-playlist', playlist: Playlist): void;
  (e: 'duplicate-playlist', playlist: Playlist): void;
}>();

function onGroupDrop(payload: { playlistId: number; groupId: number }): void {
  emit('move-playlist', payload);
}

function onPlaylistDrop(targetId: number, sourceId: number): void {
  if (sourceId === targetId) return;
  emit('reorder-playlists', { sourceId, targetId });
}

function onUngroupedDrop(event: DragEvent): void {
  event.preventDefault();
  const id = event.dataTransfer?.getData('text/plain');
  if (id) {
    emit('move-playlist', { playlistId: Number(id), groupId: null });
  }
}

const filteredGroups = computed(() => {
  const q = props.searchTerm.trim().toLowerCase();
  if (!q) return props.groups;
  return props.groups.filter((g) => g.name.toLowerCase().includes(q));
});

const groupedPlaylists = computed(() => {
  const map = new Map<number, Playlist[]>();
  for (const p of props.playlists) {
    if (p.groupId) {
      const list = map.get(p.groupId) || [];
      list.push(p);
      map.set(p.groupId, list);
    }
  }
  return map;
});

const ungroupedPlaylists = computed(() => {
  const q = props.searchTerm.trim().toLowerCase();
  return props.playlists.filter((p) => {
    if (p.groupId) return false;
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
  });
});
</script>

<template>
  <div class="space-y-4">
    <GroupCard
      v-for="group in filteredGroups"
      :key="group.id"
      :group="group"
      :playlists="groupedPlaylists.get(group.id as number) || []"
      :counts="counts"
      @edit="emit('edit-group', $event)"
      @delete="emit('delete-group', $event)"
      @drop-playlist="onGroupDrop"
      @reorder-playlists="emit('reorder-playlists', $event)"
      @edit-playlist="emit('edit-playlist', $event)"
      @delete-playlist="emit('delete-playlist', $event)"
      @duplicate-playlist="emit('duplicate-playlist', $event)"
    />

    <div
      class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7"
      @dragover.prevent
      @drop.prevent="onUngroupedDrop"
    >
      <PlaylistCard
        v-for="playlist in ungroupedPlaylists"
        :key="playlist.id"
        :playlist="playlist"
        :sentence-count="counts[playlist.id as number] || 0"
        @drop="onPlaylistDrop(playlist.id as number, $event)"
        @edit="emit('edit-playlist', $event)"
        @delete="emit('delete-playlist', $event)"
        @duplicate="emit('duplicate-playlist', $event)"
      />
    </div>
  </div>
</template>
