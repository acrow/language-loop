<script setup lang="ts">
import type { Sentence } from '@/types/models';
import SentenceItem from './SentenceItem.vue';

withDefaults(
  defineProps<{
    sentences: Sentence[];
    currentIndex: number;
    isPlaying: boolean;
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
  <div class="space-y-2">
    <SentenceItem
      v-for="(sentence, index) in sentences"
      :key="sentence.id"
      :sentence="sentence"
      :index="index"
      :active="index === currentIndex"
      :playing="index === currentIndex && isPlaying"
      :show-original-text="showOriginalText"
      @play="emit('play', $event)"
      @edit="emit('edit', $event)"
      @toggle="emit('toggle', $event)"
      @delete="emit('delete', $event)"
    />
  </div>
</template>
