<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue';
import { computed, ref } from 'vue';
import { resolveContentIcon } from '@/constants';
import type { Group, Playlist } from '@/types/models';
import PlaylistCard from './PlaylistCard.vue';

const props = defineProps<{
  group: Group;
  playlists: Playlist[];
  counts: Record<number, number>;
}>();

const emit = defineEmits<{
  (e: 'edit', group: Group): void;
  (e: 'delete', group: Group): void;
  (e: 'drop-playlist', payload: { playlistId: number; groupId: number }): void;
  (e: 'reorder-playlists', payload: { sourceId: number; targetId: number }): void;
  (e: 'edit-playlist', playlist: Playlist): void;
  (e: 'delete-playlist', playlist: Playlist): void;
  (e: 'duplicate-playlist', playlist: Playlist): void;
}>();

// Collapse state is a purely local UI preference. It lives in localStorage
// (keyed by the group's stable local id) so it survives reloads without being
// written to IndexedDB or synced to the cloud. The local id is used instead of
// cloudId because cloud sync can backfill a group's cloudId later, which would
// otherwise change the key and lose the saved state.
const COLLAPSED_STORAGE_KEY = 'language-loop:collapsed-groups';

function readCollapsedMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

const groupKey = computed(() => String(props.group.id ?? props.group.cloudId));
const collapsed = ref(readCollapsedMap()[groupKey.value] ?? false);

function toggleCollapsed(): void {
  collapsed.value = !collapsed.value;
  try {
    const map = readCollapsedMap();
    map[groupKey.value] = collapsed.value;
    localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage failures (e.g. private mode); collapse still works in-session.
  }
}

function onDrop(event: DragEvent): void {
  event.preventDefault();
  const id = event.dataTransfer?.getData('text/plain');
  if (id) {
    emit('drop-playlist', { playlistId: Number(id), groupId: props.group.id as number });
  }
}

function onPlaylistDrop(targetId: number, sourceId: number): void {
  if (sourceId === targetId) return;
  emit('reorder-playlists', { sourceId, targetId });
}
</script>

<template>
  <section class="card-surface overflow-hidden" @dragover.prevent @drop.prevent="onDrop">
    <header class="flex cursor-pointer items-center gap-3 p-4" @click="toggleCollapsed">
      <button class="btn btn-ghost btn-sm" @click.stop="toggleCollapsed">
        <AppIcon :name="collapsed ? 'chevron-right' : 'chevron-down'" :size="16" />
      </button>
      <span class="text-2xl leading-none">
        {{ resolveContentIcon(group.icon) || group.icon || '📁' }}
      </span>
      <div class="flex-1">
        <div class="font-semibold">
          {{ group.name }}
        </div>
        <div class="text-xs text-base-content/60">
          {{ $t('playlist.playlistCount', { count: playlists.length }, playlists.length) }}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" @click.stop="emit('edit', group)">
        <AppIcon name="edit" :size="16" />
      </button>
      <button class="btn btn-ghost btn-sm text-error" @click.stop="emit('delete', group)">
        <AppIcon name="delete" :size="16" />
      </button>
    </header>

    <div
      v-if="!collapsed"
      class="grid grid-cols-2 gap-3 p-4 pt-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7"
    >
      <PlaylistCard
        v-for="playlist in playlists"
        :key="playlist.id"
        :playlist="playlist"
        :sentence-count="counts[playlist.id as number] || 0"
        @drop="onPlaylistDrop(playlist.id as number, $event)"
        @edit="emit('edit-playlist', $event)"
        @delete="emit('delete-playlist', $event)"
        @duplicate="emit('duplicate-playlist', $event)"
      />
      <div
        v-if="playlists.length === 0"
        class="col-span-full rounded-xl border border-dashed border-base-300 p-4 text-center text-sm text-base-content/50"
      >
        Drop playlists here
      </div>
    </div>
  </section>
</template>
