<script setup lang="ts">
import { computed } from 'vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { getDiffHTML } from '@/lib/logic';
import type { AnswerResult } from '@/stores/test';

const props = defineProps<{ result: AnswerResult }>();
const emit = defineEmits<{ (e: 'next'): void; (e: 'retry'): void }>();

const diff = computed(() => getDiffHTML(props.result.userAnswer, props.result.correctAnswer));

function onAction(): void {
  if (props.result.isCorrect) {
    emit('next');
  } else {
    emit('retry');
  }
}
</script>

<template>
  <div class="card-surface p-6 text-center">
    <div class="text-xl font-semibold" :class="result.isCorrect ? 'text-success' : 'text-error'">
      {{ result.isCorrect ? $t('test.correct') : $t('test.notQuite') }}
    </div>

    <div v-if="result.isCorrect" class="mt-3 text-sm text-base-content/60">
      {{ $t('test.yourAnswer') }}: {{ result.userAnswer }}
    </div>

    <div v-else class="mt-4 space-y-3 text-left">
      <div>
        <div class="text-xs uppercase tracking-wide text-base-content/50">
          {{ $t('test.yourAnswer') }}
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="mt-1 text-lg leading-relaxed" v-html="diff.userHTML"></div>
      </div>
      <div>
        <div class="text-xs uppercase tracking-wide text-base-content/50">
          {{ $t('test.correctAnswer') }}
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="mt-1 text-lg leading-relaxed" v-html="diff.correctHTML"></div>
      </div>
    </div>

    <BaseButton variant="primary" full-width class="mt-4" @click="onAction">
      {{ result.isCorrect ? $t('test.nextSentence') : $t('test.tryAgain') }}
    </BaseButton>
  </div>
</template>
