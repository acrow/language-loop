<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import IconPicker from '@/components/editor/IconPicker.vue';
import { useGroupsStore } from '@/stores/groups';
import { useToast } from '@/composables/useToast';
import { CONTENT_ICONS } from '@/constants';
import type { Group } from '@/types/models';

const props = defineProps<{ open: boolean; group?: Group | null }>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'created'): void;
  (e: 'saved'): void;
}>();

const groups = useGroupsStore();
const { showToast } = useToast();
const { t } = useI18n();

const name = ref('');
const icon = ref('📁');
const saving = ref(false);

const groupIcons = [...CONTENT_ICONS];

watch(
  () => props.open,
  (open) => {
    if (open) {
      name.value = props.group?.name || '';
      icon.value = props.group?.icon || '📁';
    }
  }
);

async function save(): Promise<void> {
  if (!name.value.trim()) {
    showToast(t('playlist.groupNameRequired'), 'error');
    return;
  }

  saving.value = true;
  try {
    if (props.group?.id) {
      await groups.updateGroup(props.group.id, {
        name: name.value.trim(),
        icon: icon.value
      });
      showToast(t('playlist.groupUpdated'));
      emit('saved');
    } else {
      await groups.createGroup(name.value, icon.value);
      showToast(t('playlist.groupCreated'));
      emit('created');
    }
    emit('close');
  } catch (error) {
    console.error(error);
    showToast(t('playlist.groupCreateFailed'), 'error');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseModal
    :open="open"
    :title="group ? $t('playlist.editGroup') : $t('playlist.createGroupMenu')"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <BaseInput
        v-model="name"
        :label="$t('playlist.groupName')"
        :placeholder="$t('playlist.groupNamePlaceholder')"
      />
      <div>
        <span class="label-text">{{ $t('playlist.chooseIcon') }}</span>
        <IconPicker v-model="icon" :icons="groupIcons" />
      </div>
    </div>

    <template #footer>
      <BaseButton variant="ghost" @click="emit('close')">
        {{ $t('common.cancel') }}
      </BaseButton>
      <BaseButton variant="primary" :loading="saving" @click="save">
        {{ group ? $t('playlist.editGroup') : $t('playlist.createGroupMenu') }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
