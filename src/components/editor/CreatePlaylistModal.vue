<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseTextarea from '@/components/ui/BaseTextarea.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import IconPicker from '@/components/editor/IconPicker.vue';
import { usePlaylistsStore } from '@/stores/playlists';
import { useGroupsStore } from '@/stores/groups';
import { useSettingsStore } from '@/stores/settings';
import { useToast } from '@/composables/useToast';
import { LANGUAGES } from '@/constants/languages';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'created', id: number): void }>();

const playlists = usePlaylistsStore();
const groups = useGroupsStore();
const settings = useSettingsStore();
const { showToast } = useToast();
const { t } = useI18n();

const name = ref('');
const targetLang = ref('en-US');
const nativeLang = ref('en-US');
const icon = ref('📖');
const description = ref('');
const groupId = ref('');
const saving = ref(false);

const languageOptions = LANGUAGES.map((l) => ({ value: l.code, label: l.name }));

const groupOptions = computed(() => [
  { value: '', label: t('playlist.noGroup') },
  ...groups.groups.map((g) => ({ value: String(g.id), label: `${g.icon} ${g.name}` }))
]);

watch(
  () => props.open,
  (open) => {
    if (open) {
      name.value = '';
      targetLang.value = settings.globalTargetLang || 'en-US';
      nativeLang.value = settings.interfaceLanguage || 'en-US';
      icon.value = '📖';
      description.value = '';
      groupId.value = '';
      void groups.loadGroups();
    }
  }
);

async function create(): Promise<void> {
  if (!name.value.trim()) {
    showToast('Please enter a playlist name', 'error');
    return;
  }

  saving.value = true;
  try {
    const id = await playlists.createPlaylist(
      name.value,
      targetLang.value,
      nativeLang.value,
      icon.value,
      description.value,
      groupId.value ? Number(groupId.value) : null
    );
    showToast('Playlist created');
    emit('created', id);
    emit('close');
  } catch (error) {
    console.error(error);
    showToast('Failed to create playlist', 'error');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseModal :open="open" :title="$t('playlist.createPlaylist')" @close="emit('close')">
    <div class="space-y-4">
      <BaseInput
        v-model="name"
        :label="$t('playlist.playlistName')"
        placeholder="e.g., Daily Chinese Practice"
      />
      <BaseSelect
        v-model="targetLang"
        :label="$t('playlist.targetLanguage')"
        :options="languageOptions"
      />
      <BaseSelect
        v-model="nativeLang"
        :label="$t('playlist.nativeLanguage')"
        :options="languageOptions"
      />
      <BaseSelect v-model="groupId" :label="$t('playlist.group')" :options="groupOptions" />
      <div>
        <span class="label-text">{{ $t('playlist.icon') }}</span>
        <IconPicker v-model="icon" />
      </div>
      <BaseTextarea
        v-model="description"
        :label="$t('playlist.description')"
        placeholder="What is this playlist for?"
      />
    </div>

    <template #footer>
      <BaseButton variant="ghost" @click="emit('close')">
        {{ $t('common.cancel') }}
      </BaseButton>
      <BaseButton variant="primary" :loading="saving" @click="create">
        {{ $t('playlist.createPlaylist') }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
