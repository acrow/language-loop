<script setup lang="ts">
import { CONTENT_ICONS } from '@/constants';

withDefaults(
  defineProps<{
    modelValue: string;
    icons?: string[];
  }>(),
  {
    icons: () => [...CONTENT_ICONS]
  }
);

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();
</script>

<template>
  <div class="grid max-h-64 grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-8">
    <button
      v-for="icon in icons"
      :key="icon"
      type="button"
      class="btn aspect-square text-xl leading-none"
      :class="modelValue === icon ? 'btn-primary' : 'btn-ghost'"
      :title="icon"
      @click="emit('update:modelValue', icon)"
    >
      {{ icon }}
    </button>
  </div>
</template>
