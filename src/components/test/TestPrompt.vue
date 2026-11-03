<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue';
import AppIcon from '@/components/ui/AppIcon.vue';

defineProps<{
  label: string;
  text: string;
}>();

const emit = defineEmits<{ (e: 'play'): void }>();
</script>

<template>
  <div class="card-surface p-6 text-center">
    <div class="text-xs uppercase tracking-wide text-base-content/50">
      {{ label }}
    </div>
    <div class="mt-2 text-2xl font-semibold">
      {{ text }}
    </div>
    <BaseButton variant="secondary" size="sm" class="mt-3" @click="emit('play')">
      <AppIcon name="volume" /> {{ $t('common.play') }}
    </BaseButton>
  </div>
</template>
