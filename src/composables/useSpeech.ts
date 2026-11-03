import { ref } from 'vue';
import { audioEngine } from '@/services/audio';

// Speech recognition composable for voice input and speaking tests.
export function useSpeech() {
  const isListening = ref(false);
  const transcript = ref('');
  const isSupported = ref(
    typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );

  async function start(lang: string, onFinal?: (text: string) => void): Promise<boolean> {
    transcript.value = '';
    isListening.value = true;

    const ok = await audioEngine.startSpeechRecognition(
      lang,
      (text, isFinal) => {
        transcript.value = text;
        if (isFinal && onFinal) onFinal(text);
      },
      () => {
        isListening.value = false;
      }
    );

    if (!ok) isListening.value = false;
    return ok;
  }

  async function stop(): Promise<void> {
    await audioEngine.stopSpeechRecognition();
    isListening.value = false;
  }

  return { isListening, transcript, isSupported, start, stop };
}
