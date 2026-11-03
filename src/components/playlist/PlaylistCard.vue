<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Playlist } from '@/types/models';
import { LANGUAGE_ABBREVIATIONS, LANGUAGE_NAMES, resolveContentIcon } from '@/constants';
import AppIcon from '@/components/ui/AppIcon.vue';

const props = defineProps<{
  playlist: Playlist;
  sentenceCount: number;
}>();

const emit = defineEmits<{
  (e: 'drop', sourceId: number): void;
  (e: 'edit', playlist: Playlist): void;
  (e: 'delete', playlist: Playlist): void;
  (e: 'duplicate', playlist: Playlist): void;
}>();

const router = useRouter();

const targetLangName = computed(
  () => LANGUAGE_NAMES[props.playlist.targetLang] || props.playlist.targetLang
);
const nativeLangName = computed(
  () => LANGUAGE_NAMES[props.playlist.nativeLang] || props.playlist.nativeLang
);
const targetLangAbbr = computed(
  () => LANGUAGE_ABBREVIATIONS[props.playlist.targetLang] || props.playlist.targetLang
);
const nativeLangAbbr = computed(
  () => LANGUAGE_ABBREVIATIONS[props.playlist.nativeLang] || props.playlist.nativeLang
);

function open(): void {
  router.push({ name: 'player', params: { id: props.playlist.id } });
}

function onDragStart(event: DragEvent): void {
  if (!event.dataTransfer) return;
  event.dataTransfer.setData('text/plain', String(props.playlist.id));
  event.dataTransfer.effectAllowed = 'move';
}

function onDrop(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
  const id = event.dataTransfer?.getData('text/plain');
  if (id) emit('drop', Number(id));
}
</script>

<template>
  <article
    class="card-surface flex cursor-pointer flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
    draggable="true"
    @click="open"
    @dragstart="onDragStart"
    @dragover.prevent.stop
    @drop.prevent.stop="onDrop"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="text-4xl leading-none">
        {{ resolveContentIcon(playlist.icon) || playlist.icon || '📚' }}
      </div>
      <div class="flex min-w-0 flex-1 flex-col items-end gap-1">
        <span
          class="badge badge-primary badge-sm shrink-0 gap-1"
          :title="`${nativeLangName} → ${targetLangName}`"
        >
          {{ nativeLangAbbr }}
          <AppIcon name="arrow-right" :size="12" />
          {{ targetLangAbbr }}
        </span>
        <h3 class="w-full break-words text-right text-base font-semibold leading-snug">
          {{ playlist.name }}
        </h3>
      </div>
    </div>
    <p v-if="playlist.description" class="mt-1 line-clamp-2 text-xs text-base-content/60">
      {{ playlist.description }}
    </p>
    <div class="mt-auto pt-2">
      <div class="text-xs text-base-content/60">
        {{ $t('playlist.sentenceCount', { count: sentenceCount }, sentenceCount) }}
      </div>
      <div class="mt-1 flex justify-end gap-0.5">
        <button
          type="button"
          class="btn btn-ghost btn-xs"
          title="Edit playlist"
          @click.stop="emit('edit', playlist)"
        >
          <AppIcon name="edit" :size="16" />
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-xs"
          title="Duplicate playlist"
          @click.stop="emit('duplicate', playlist)"
        >
          <AppIcon name="duplicate" :size="16" />
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-xs text-error"
          title="Delete playlist"
          @click.stop="emit('delete', playlist)"
        >
          <AppIcon name="delete" :size="16" />
        </button>
      </div>
    </div>
  </article>
</template>
