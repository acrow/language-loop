<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppHeader from '@/components/layout/AppHeader.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import AppIcon from '@/components/ui/AppIcon.vue';
import TestPrompt from '@/components/test/TestPrompt.vue';
import TestFeedback from '@/components/test/TestFeedback.vue';
import { useTestStore, type AnswerResult } from '@/stores/test';
import { usePlaylistsStore } from '@/stores/playlists';
import { useToast } from '@/composables/useToast';

const route = useRoute();
const router = useRouter();
const test = useTestStore();
const playlists = usePlaylistsStore();
const { showToast } = useToast();

const mode = computed<'writing' | 'speaking'>(() =>
  route.query.mode === 'speaking' ? 'speaking' : 'writing'
);
const answer = ref('');
const feedback = ref<AnswerResult | null>(null);
const complete = ref(false);
const answerInput = ref<HTMLTextAreaElement | null>(null);

const playlistId = computed(() => Number(route.params.id));
const title = computed(() =>
  mode.value === 'speaking' ? 'test.speakingTest' : 'test.writingTest'
);

onMounted(async () => {
  await playlists.loadPlaylists();
  const ok = await test.startTest(playlistId.value, mode.value);
  if (!ok) {
    showToast('No sentences in this playlist to test', 'warning');
    router.push('/library');
  }
});

// Single Enter handler for the whole test view:
// - While typing, Enter submits the answer.
// - While feedback is visible, Enter triggers the default feedback button
//   (Next when correct, Try Again when wrong).
// Handling both in one place avoids the submit keypress also firing the
// feedback action on the same event.
function onFeedbackKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter') return;
  if (event.isComposing || event.keyCode === 229) return;

  if (feedback.value) {
    if (complete.value) return;
    event.preventDefault();
    if (feedback.value.isCorrect) {
      next();
    } else {
      void retryAnswer();
    }
    return;
  }

  if (event.target instanceof HTMLTextAreaElement) {
    event.preventDefault();
    void submit();
  }
}

onMounted(() => document.addEventListener('keydown', onFeedbackKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onFeedbackKeydown));

async function submit(): Promise<void> {
  if (!answer.value.trim()) {
    showToast('Please enter your answer', 'error');
    return;
  }
  feedback.value = await test.checkAnswer(answer.value);
}

async function retryAnswer(): Promise<void> {
  feedback.value = null;
  answer.value = '';
  await nextTick();
  answerInput.value?.focus();
}

async function speak(): Promise<void> {
  if (test.isListening) {
    test.stopSpeechRecognition();
    return;
  }
  const transcript = await test.startSpeechRecognition();
  if (transcript) {
    answer.value = transcript;
  }
}

async function next(): Promise<void> {
  feedback.value = null;
  answer.value = '';
  test.nextSentence();
  if (test.isComplete) {
    complete.value = true;
    return;
  }
  // Return focus to the answer box for the next sentence.
  await nextTick();
  answerInput.value?.focus();
}

async function previous(): Promise<void> {
  if (test.currentIndex <= 0) return;
  feedback.value = null;
  answer.value = '';
  test.previousSentence();
  await nextTick();
  answerInput.value?.focus();
}

function retry(): void {
  complete.value = false;
  feedback.value = null;
  answer.value = '';
  test.startTest(playlistId.value, mode.value);
}

function back(): void {
  router.push({ name: 'player', params: { id: playlistId.value } });
}
</script>

<template>
  <div class="app-shell">
    <AppHeader :title="$t(title)">
      <template #left>
        <BaseButton variant="icon" title="Back" @click="back">
          <AppIcon name="arrow-left" />
        </BaseButton>
      </template>
    </AppHeader>

    <div class="mx-auto max-w-2xl px-4 py-6">
      <div v-if="!complete" class="space-y-4">
        <div class="flex items-center justify-between text-sm text-base-content/60">
          <div class="flex items-center gap-1">
            <button
              class="btn btn-ghost btn-xs"
              title="Previous sentence"
              :disabled="test.currentIndex === 0"
              @click="previous"
            >
              <AppIcon name="arrow-left" :size="16" />
            </button>
            <span>{{ test.progress.current }} / {{ test.progress.total }}</span>
            <button class="btn btn-ghost btn-xs" title="Next sentence" @click="next">
              <AppIcon name="arrow-right" :size="16" />
            </button>
          </div>
          <span>Score: {{ test.progress.correct }}/{{ test.progress.attempted }}</span>
        </div>

        <TestPrompt
          label="Translate to target language"
          :text="test.currentSentence?.nativeText || ''"
          @play="test.playTestSentence"
        />

        <div v-if="!feedback">
          <textarea
            ref="answerInput"
            v-model="answer"
            class="textarea textarea-bordered w-full"
            rows="3"
            placeholder="Type your answer here..."
          />
          <div class="mt-3 flex gap-2">
            <BaseButton
              v-if="mode === 'speaking'"
              variant="secondary"
              class="min-w-0 flex-1"
              :class="test.isListening ? 'animate-pulse' : ''"
              @click="speak"
            >
              <AppIcon name="speaking" />
              {{ test.isListening ? 'Listening…' : $t('test.speakAnswer') }}
            </BaseButton>
            <BaseButton variant="primary" class="min-w-0 flex-1" @click="submit">
              {{ $t('common.submit') }}
            </BaseButton>
          </div>
        </div>

        <TestFeedback v-else :result="feedback" @next="next" @retry="retryAnswer" />
      </div>

      <div v-else class="text-center">
        <div class="flex justify-center text-primary">
          <AppIcon name="sparkles" :size="48" />
        </div>
        <h2 class="mt-4 text-xl font-semibold">
          {{ $t('test.testComplete') }}
        </h2>
        <div class="mt-2 text-2xl font-bold text-primary">
          {{ test.progress.correct }} / {{ test.progress.total }} ({{ test.progress.percentage }}%)
        </div>
        <div class="mt-6 flex justify-center gap-3">
          <BaseButton variant="primary" @click="retry">
            {{ $t('test.retryTest') }}
          </BaseButton>
          <BaseButton variant="secondary" @click="back">
            {{ $t('test.backToPlayer') }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
