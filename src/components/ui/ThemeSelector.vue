<script setup lang="ts">
import BaseModal from '@/components/ui/BaseModal.vue';
import { useTheme } from '@/composables/useTheme';
import { THEME_NAMES, type ThemeName } from '@/constants';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const { currentTheme, setTheme, themes } = useTheme();

async function choose(theme: ThemeName): Promise<void> {
  await setTheme(theme);
  emit('close');
}
</script>

<template>
  <BaseModal :open="open" title="Choose Theme" @close="emit('close')">
    <div class="grid grid-cols-2 gap-3">
      <button
        v-for="theme in themes"
        :key="theme"
        class="btn h-auto flex-col justify-start p-3"
        :class="currentTheme === theme ? 'btn-primary' : 'btn-ghost'"
        @click="choose(theme)"
      >
        {{ THEME_NAMES[theme] }}
      </button>
    </div>
  </BaseModal>
</template>
