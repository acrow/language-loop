<script setup lang="ts">
import type { Sentence } from '@/types/models';
import AppIcon from '@/components/ui/AppIcon.vue';

withDefaults(
  defineProps<{
    sentence: Sentence;
    index: number;
    active: boolean;
    playing: boolean;
    showOriginalText?: boolean;
  }>(),
  {
    showOriginalText: true
  }
);

const emit = defineEmits<{
  (e: 'play', index: number): void;
  (e: 'edit', sentence: Sentence): void;
  (e: 'toggle', sentence: Sentence): void;
  (e: 'delete', sentence: Sentence): void;
}>();
</script>

<template>
  <div
    class="flex flex-col gap-2 rounded-xl border p-3 transition sm:flex-row sm:items-center sm:gap-3"
    :class="[
      active ? 'border-primary bg-primary/10' : 'border-base-300 bg-base-200',
      sentence.disabled ? 'opacity-50' : ''
    ]"
  >
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <button class="text-base-content/40" @click="emit('play', index)">⋮⋮</button>

      <div class="min-w-0 flex-1 cursor-pointer" @click="emit('play', index)">
        <div
          v-if="showOriginalText"
          class="font-medium"
          :class="{ 'line-through': sentence.disabled }"
        >
          {{ sentence.targetText }}
        </div>
        <div class="text-sm text-base-content/60" :class="{ 'line-through': sentence.disabled }">
          {{ sentence.nativeText }}
        </div>
        <div
          v-if="sentence.memo"
          class="mt-1 inline-flex items-center gap-1 text-xs italic text-base-content/50"
        >
          <AppIcon name="writing" :size="12" /> {{ sentence.memo }}
        </div>
      </div>
    </div>

    <div class="flex justify-end gap-1 sm:shrink-0">
      <button
        class="btn btn-ghost btn-xs"
        title="Edit"
        aria-label="Edit"
        @click="emit('edit', sentence)"
      >
        <AppIcon name="edit" :size="16" />
      </button>
      <button
        class="btn btn-ghost btn-xs"
        :title="sentence.disabled ? 'Enable' : 'Disable'"
        :aria-label="sentence.disabled ? 'Enable' : 'Disable'"
        @click="emit('toggle', sentence)"
      >
        <AppIcon :name="sentence.disabled ? 'eye' : 'ban'" :size="16" />
      </button>
      <button
        class="btn btn-ghost btn-xs text-error"
        title="Delete"
        aria-label="Delete"
        @click="emit('delete', sentence)"
      >
        <AppIcon name="delete" :size="16" />
      </button>
    </div>
  </div>
</template>
