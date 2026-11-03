import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { storage } from '@/services/storage';
import { audioEngine } from '@/services/audio';
import { calculateSimilarity, getDiffHTML, normalizeText } from '@/lib/logic';
import type { Sentence } from '@/types/models';

export type TestMode = 'writing' | 'speaking';

export interface AnswerResult {
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  similarity: number;
}

export const useTestStore = defineStore('test', () => {
  const currentPlaylistId = ref<number | null>(null);
  const sentences = ref<Sentence[]>([]);
  const currentIndex = ref(0);
  const testMode = ref<TestMode>('writing');
  const correctCount = ref(0);
  const attemptedCount = ref(0);
  const isListening = ref(false);
  const recognizedText = ref('');

  const currentSentence = computed(() => sentences.value[currentIndex.value] || null);
  const isComplete = computed(() => currentIndex.value >= sentences.value.length);
  const progress = computed(() => ({
    current: currentIndex.value + 1,
    total: sentences.value.length,
    correct: correctCount.value,
    attempted: attemptedCount.value,
    percentage:
      attemptedCount.value > 0 ? Math.round((correctCount.value / attemptedCount.value) * 100) : 0
  }));

  function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  async function startTest(playlistId: number, mode: TestMode): Promise<boolean> {
    currentPlaylistId.value = playlistId;
    testMode.value = mode;
    currentIndex.value = 0;
    correctCount.value = 0;
    attemptedCount.value = 0;

    const allSentences = await storage.getSentencesByPlaylist(playlistId);
    sentences.value = shuffleArray(allSentences.filter((s) => !s.disabled));

    return sentences.value.length > 0;
  }

  async function checkAnswer(userAnswer: string): Promise<AnswerResult> {
    const sentence = currentSentence.value;
    if (!sentence) throw new Error('No current sentence');

    const correctAnswer = sentence.targetText;
    const normalizedUser = normalizeText(userAnswer);
    const normalizedCorrect = normalizeText(correctAnswer);

    const isCorrect = normalizedUser === normalizedCorrect;
    attemptedCount.value++;

    if (isCorrect) correctCount.value++;

    const similarity = calculateSimilarity(normalizedUser, normalizedCorrect);

    // Auto-reorder on perfect match.
    if (isCorrect && similarity === 100) {
      sentence.successCount = (sentence.successCount || 0) + 1;
      await storage.updateSentence(sentence.id as number, {
        successCount: sentence.successCount
      });

      const allSentences = await storage.getSentencesByPlaylist(currentPlaylistId.value as number);
      allSentences.sort((a, b) => {
        const sa = a.successCount || 0;
        const sb = b.successCount || 0;
        if (sa !== sb) return sa - sb;
        return a.order - b.order;
      });

      const newOrderIds = allSentences.map((s) => s.id as number);
      await Promise.all(
        newOrderIds.map((id, index) => storage.updateSentence(id, { order: index }))
      );
    }

    return { isCorrect, userAnswer, correctAnswer, similarity };
  }

  function nextSentence(): void {
    currentIndex.value++;
  }

  function previousSentence(): void {
    if (currentIndex.value > 0) currentIndex.value--;
  }

  async function startSpeechRecognition(): Promise<string> {
    const sentence = currentSentence.value;
    if (!sentence) return '';

    const playlist = await storage.getPlaylist(currentPlaylistId.value as number);
    const lang = playlist?.targetLang || 'en-US';

    recognizedText.value = '';
    isListening.value = true;

    return new Promise((resolve) => {
      audioEngine.startSpeechRecognition(
        lang,
        (transcript) => {
          recognizedText.value = transcript;
        },
        () => {
          isListening.value = false;
          resolve(recognizedText.value);
        }
      );
    });
  }

  function stopSpeechRecognition(): void {
    audioEngine.stopSpeechRecognition();
    isListening.value = false;
  }

  async function playTestSentence(): Promise<void> {
    const sentence = currentSentence.value;
    if (!sentence) return;

    const playlist = await storage.getPlaylist(currentPlaylistId.value as number);
    const lang = sentence.targetLang || playlist?.targetLang || 'en-US';

    if (sentence.customAudio) {
      await audioEngine.playCustomAudio(sentence.customAudio);
    } else {
      await audioEngine.playTTS(sentence.targetText, lang);
    }
  }

  function getDiff(userAnswer: string, correctAnswer: string) {
    return getDiffHTML(userAnswer, correctAnswer);
  }

  return {
    currentPlaylistId,
    sentences,
    currentIndex,
    testMode,
    correctCount,
    attemptedCount,
    isListening,
    recognizedText,
    currentSentence,
    isComplete,
    progress,
    startTest,
    checkAnswer,
    nextSentence,
    previousSentence,
    startSpeechRecognition,
    stopSpeechRecognition,
    playTestSentence,
    getDiff
  };
});
