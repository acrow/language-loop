<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { usePlaylistsStore } from '@/stores/playlists';
import { useToast } from '@/composables/useToast';
import { audioEngine } from '@/services/audio';
import type { Playlist } from '@/types/models';

const props = defineProps<{ open: boolean; playlist: Playlist | null }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved'): void }>();

const playlists = usePlaylistsStore();
const { showToast } = useToast();
const { t } = useI18n();

const repeatCount = ref(2);
const pauseDuration = ref(1);
const speechRate = ref(1);
const preferredVoice = ref('');
const speakNative = ref(false);
const saving = ref(false);
const voiceOptions = ref<{ value: string; label: string }[]>([]);

watch(
  () => props.open,
  (open) => {
    if (open && props.playlist) {
      const s = props.playlist.settings;
      repeatCount.value = s.repeatCount;
      pauseDuration.value = s.pauseDuration;
      speechRate.value = s.speechRate;
      preferredVoice.value = s.preferredVoice;
      speakNative.value = s.speakNative;

      const voices = audioEngine.getAvailableVoicesForLanguage(props.playlist.targetLang);
      voiceOptions.value = [
        { value: '', label: t('settings.autoVoice') },
        ...voices.map((v) => ({ value: v.name, label: `${v.name} (${v.lang})` }))
      ];
    }
  }
);

async function save(): Promise<void> {
  if (!props.playlist) return;

  saving.value = true;
  try {
    await playlists.updatePlaylist(props.playlist.id as number, {
      settings: {
        repeatCount: repeatCount.value,
        pauseDuration: pauseDuration.value,
        speechRate: speechRate.value,
        preferredVoice: preferredVoice.value,
        speakNative: speakNative.value
      }
    });

    audioEngine.setPlaybackSettings(repeatCount.value, pauseDuration.value);
    audioEngine.speechRate = speechRate.value;
    audioEngine.preferredVoiceName = preferredVoice.value;
    audioEngine.speakNativeLanguage = speakNative.value;

    showToast(t('settings.saved'));
    emit('saved');
    emit('close');
  } catch (error) {
    console.error(error);
    showToast(t('settings.saveFailed'), 'error');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseModal :open="open" :title="$t('playlist.settingsMenu')" @close="emit('close')">
    <div class="space-y-4">
      <label class="form-control">
        <span class="label-text">{{ $t('settings.repeatCount') }}</span>
        <input
          v-model.number="repeatCount"
          type="number"
          min="1"
          max="10"
          class="input input-bordered w-full"
        />
      </label>

      <label class="form-control">
        <span class="label-text">{{ $t('settings.pauseDuration') }}</span>
        <input
          v-model.number="pauseDuration"
          type="number"
          min="0"
          max="10"
          step="0.5"
          class="input input-bordered w-full"
        />
      </label>

      <label class="form-control">
        <span class="label-text">{{ $t('settings.speechRate') }}: {{ speechRate.toFixed(1) }}x</span>
        <input
          v-model.number="speechRate"
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          class="range range-primary"
        />
      </label>

      <BaseSelect
        v-model="preferredVoice"
        :label="$t('settings.voiceSelect')"
        :options="voiceOptions"
      />

      <label class="label cursor-pointer justify-start gap-3">
        <input v-model="speakNative" type="checkbox" class="checkbox checkbox-primary" />
        <span class="label-text">{{ $t('settings.speakNative') }}</span>
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
