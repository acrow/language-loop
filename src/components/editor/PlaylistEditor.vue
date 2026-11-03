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
import { useToast } from '@/composables/useToast';
import { useDialog } from '@/composables/useDialog';
import { LANGUAGES } from '@/constants/languages';
import type { Playlist } from '@/types/models';

const props = defineProps<{ open: boolean; playlist: Playlist | null }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved'): void }>();

const playlists = usePlaylistsStore();
const groups = useGroupsStore();
const { showToast } = useToast();
const { confirm } = useDialog();
const { t } = useI18n();

const name = ref('');
const icon = ref('📖');
const description = ref('');
const targetLang = ref('en-US');
const mergeId = ref('');
const groupId = ref('');
const saving = ref(false);

const languageOptions = LANGUAGES.map((l) => ({ value: l.code, label: l.name }));

const mergeOptions = computed(() => [
  { value: '', label: t('playlist.mergeSelectOption') },
  ...playlists.playlists
    .filter((p) => p.id !== props.playlist?.id && p.targetLang === props.playlist?.targetLang)
    .map((p) => ({ value: String(p.id), label: p.name }))
]);

const groupOptions = computed(() => [
  { value: '', label: t('playlist.noGroup') },
  ...groups.groups.map((g) => ({ value: String(g.id), label: `${g.icon} ${g.name}` }))
]);

watch(
  () => props.open,
  (open) => {
    if (open && props.playlist) {
      name.value = props.playlist.name;
      icon.value = props.playlist.icon || '📖';
      description.value = props.playlist.description || '';
      targetLang.value = props.playlist.targetLang;
      groupId.value = props.playlist.groupId ? String(props.playlist.groupId) : '';
      mergeId.value = '';
      void groups.loadGroups();
    }
  }
);

async function save(): Promise<void> {
  if (!props.playlist || !name.value.trim()) {
    showToast(t('playlist.nameRequired'), 'error');
    return;
  }

  saving.value = true;
  try {
    const id = props.playlist.id as number;
    const languageChanged = targetLang.value !== props.playlist.targetLang;

    if (languageChanged) {
      const count = await playlists.getSentenceCount(id);
      if (count > 0) {
        const auto = (await confirm(
          t('playlist.changeLanguageConfirm', { count }),
          t('playlist.changeLanguageTitle')
        )) as boolean;
        await playlists.changePlaylistLanguage(id, targetLang.value, auto);
      }
    }

    await playlists.updatePlaylist(id, {
      name: name.value.trim(),
      icon: icon.value,
      description: description.value.trim(),
      groupId: groupId.value ? Number(groupId.value) : null
    });

    if (mergeId.value) {
      const merge = await confirm(t('playlist.mergeConfirm'), t('playlist.mergeTitle'));
      if (merge) {
        const added = await playlists.mergePlaylists(id, Number(mergeId.value));
        showToast(t('playlist.mergedCount', { count: added }));
      }
    }

    showToast(t('playlist.updateSuccess', { name: name.value.trim() }));
    emit('saved');
    emit('close');
  } catch (error) {
    console.error(error);
    showToast(t('playlist.updateFailed'), 'error');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="$t('playlist.editPlaylist')"
    :close-on-backdrop="false"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <BaseInput
        v-model="name"
        :label="$t('playlist.playlistName')"
        :placeholder="$t('playlist.playlistNamePlaceholder')"
      />
      <BaseSelect
        v-model="targetLang"
        :label="$t('playlist.targetLanguage')"
        :options="languageOptions"
      />
      <BaseSelect v-model="groupId" :label="$t('playlist.group')" :options="groupOptions" />
      <div>
        <span class="label-text">{{ $t('playlist.chooseIcon') }}</span>
        <IconPicker v-model="icon" />
      </div>
      <BaseTextarea
        v-model="description"
        :label="$t('playlist.description')"
        :placeholder="$t('playlist.descriptionPlaceholder')"
      />
      <BaseSelect
        v-model="mergeId"
        :label="$t('playlist.mergePlaylist')"
        :options="mergeOptions"
      />
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
