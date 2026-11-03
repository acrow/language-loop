<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseTextarea from '@/components/ui/BaseTextarea.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import AppIcon from '@/components/ui/AppIcon.vue';
import { usePlaylistsStore } from '@/stores/playlists';
import { useToast } from '@/composables/useToast';
import { useAudio } from '@/composables/useAudio';
import { useSpeech } from '@/composables/useSpeech';
import { translationService } from '@/services/translation';
import type { Sentence } from '@/types/models';

const props = defineProps<{
  open: boolean;
  sentence: Sentence | null;
}>();

const emit = defineEmits<{ (e: 'close'): void; (e: 'saved'): void }>();

const playlists = usePlaylistsStore();
const { showToast } = useToast();
const { audioEngine } = useAudio();
const { isListening, isSupported, start: startSpeech, stop: stopSpeech } = useSpeech();

const targetText = ref('');
const nativeText = ref('');
const memo = ref('');
const keepOpen = ref(false);
const saving = ref(false);
const isRecording = ref(false);
const recordedAudio = ref<Blob | null>(null);
const translating = ref(false);

const playlist = computed(() =>
  playlists.playlists.find((p) => p.id === playlists.currentPlaylistId)
);

watch(
  () => props.open,
  (open) => {
    if (open) {
      targetText.value = props.sentence?.targetText || '';
      nativeText.value = props.sentence?.nativeText || '';
      memo.value = props.sentence?.memo || '';
      recordedAudio.value = props.sentence?.customAudio ?? null;
      isRecording.value = false;
    }
  }
);

async function toggleRecording(): Promise<void> {
  if (isRecording.value) {
    recordedAudio.value = await audioEngine.stopRecording();
    isRecording.value = false;
    return;
  }

  const ok = await audioEngine.startRecording();
  if (ok) {
    isRecording.value = true;
  } else {
    showToast('Could not access microphone', 'error');
  }
}

function playRecorded(): void {
  if (!recordedAudio.value) return;
  const url = URL.createObjectURL(recordedAudio.value);
  const audio = new Audio(url);
  audio.play();
  audio.onended = () => URL.revokeObjectURL(url);
}

async function toggleVoiceInput(): Promise<void> {
  if (isListening.value) {
    await stopSpeech();
    return;
  }

  const lang = playlist.value?.targetLang || 'en-US';
  const ok = await startSpeech(lang, (text) => {
    targetText.value = text;
    // Once voice input finishes, translate automatically.
    void autoTranslate();
  });
  if (!ok) showToast('Speech recognition is not available', 'warning');
}

async function autoTranslate(): Promise<void> {
  if (!targetText.value.trim()) {
    showToast('Enter the target sentence first', 'error');
    return;
  }
  if (!playlist.value) return;

  translating.value = true;
  try {
    nativeText.value = await translationService.translate(
      targetText.value,
      playlist.value.targetLang,
      playlist.value.nativeLang
    );
  } finally {
    translating.value = false;
  }
}

async function save(): Promise<void> {
  if (!targetText.value.trim() || !nativeText.value.trim()) {
    showToast('Please fill in both sentences', 'error');
    return;
  }

  saving.value = true;
  try {
    if (props.sentence) {
      await playlists.updateSentence(props.sentence.id as number, {
        targetText: targetText.value.trim(),
        nativeText: nativeText.value.trim(),
        memo: memo.value.trim(),
        speechRate: null,
        customAudio: recordedAudio.value
      });
    } else {
      await playlists.addSentence(playlists.currentPlaylistId as number, {
        targetText: targetText.value.trim(),
        nativeText: nativeText.value.trim(),
        memo: memo.value.trim(),
        customAudio: recordedAudio.value
      });
    }

    audioEngine.loadPlaylist(playlists.currentSentences);
    showToast('Sentence saved');
    emit('saved');

    if (keepOpen.value && !props.sentence) {
      // Keep the dialog open and clear the form for the next sentence.
      targetText.value = '';
      nativeText.value = '';
      memo.value = '';
      recordedAudio.value = null;
    } else {
      emit('close');
    }
  } catch (error) {
    console.error(error);
    showToast('Failed to save sentence', 'error');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="sentence ? $t('sentence.editSentence') : $t('sentence.addSentence')"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <div>
        <BaseTextarea
          v-model="targetText"
          :label="$t('sentence.targetText')"
          placeholder="Enter sentence in the language you're learning"
        />
        <BaseButton
          variant="secondary"
          size="sm"
          class="mt-2"
          :disabled="!isSupported"
          @click="toggleVoiceInput"
        >
          <AppIcon :name="isListening ? 'stop' : 'speaking'" />
          {{ isListening ? 'Stop' : $t('sentence.voiceInput') }}
        </BaseButton>
      </div>

      <div>
        <BaseTextarea
          v-model="nativeText"
          :label="$t('sentence.nativeText')"
          placeholder="Enter translation in your native language"
        />
        <BaseButton
          variant="secondary"
          size="sm"
          class="mt-2"
          :loading="translating"
          @click="autoTranslate"
        >
          <AppIcon name="globe" /> {{ $t('sentence.autoTranslate') }}
        </BaseButton>
      </div>

      <BaseInput
        v-model="memo"
        label="Memo (optional)"
        placeholder="Notes, grammar tips, context..."
      />

      <div>
        <span class="label-text">{{ $t('sentence.customAudio') }}</span>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <BaseButton variant="secondary" size="sm" @click="toggleRecording">
            <AppIcon :name="isRecording ? 'stop' : 'speaking'" />
            {{ isRecording ? 'Stop' : $t('sentence.recordBtn') }}
          </BaseButton>
          <BaseButton v-if="recordedAudio" variant="secondary" size="sm" @click="playRecorded">
            <AppIcon name="play" /> {{ $t('common.play') }}
          </BaseButton>
          <BaseButton
            v-if="recordedAudio"
            variant="secondary"
            size="sm"
            @click="recordedAudio = null"
          >
            <AppIcon name="delete" /> {{ $t('common.delete') }}
          </BaseButton>
        </div>
      </div>

      <label v-if="!sentence" class="label cursor-pointer justify-start gap-3">
        <input v-model="keepOpen" type="checkbox" class="checkbox checkbox-primary" />
        <span class="label-text">{{ $t('sentence.addAnother') }}</span>
      </label>
    </div>

    <template #footer>
      <BaseButton variant="ghost" @click="emit('close')">
        {{ $t('common.cancel') }}
      </BaseButton>
      <BaseButton variant="primary" :loading="saving" @click="save">
        {{ $t('common.save') }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
