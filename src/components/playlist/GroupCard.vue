<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue';
import { ref } from 'vue';
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

const collapsed = ref(props.group.collapsed ?? false);

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
    <header class="flex cursor-pointer items-center gap-3 p-4" @click="collapsed = !collapsed">
      <button class="btn btn-ghost btn-sm" @click.stop="collapsed = !collapsed">
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
