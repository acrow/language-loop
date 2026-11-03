<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import { storage } from '@/services/storage';
import type { Sentence } from '@/types/models';

const props = defineProps<{
  open: boolean;
  playlistId: number | null;
  playlistName: string;
}>();

const emit = defineEmits<{ (e: 'close'): void }>();

const sentences = ref<Sentence[]>([]);

watch(
  () => props.open,
  async (open) => {
    if (open && props.playlistId) {
      sentences.value = await storage.getSentencesByPlaylist(props.playlistId);
    }
  }
);

const stats = computed(() => {
  const total = sentences.value.length;
  const disabled = sentences.value.filter((s) => s.disabled).length;
  const active = total - disabled;
  const totalSuccess = sentences.value.reduce((sum, s) => sum + (s.successCount || 0), 0);
  const mastered = sentences.value.filter((s) => (s.successCount || 0) >= 3).length;
  const avg = total > 0 ? (totalSuccess / total).toFixed(1) : '0.0';
  return { total, active, disabled, mastered, avg };
});
</script>

<template>
  <BaseModal :open="open" :title="$t('stats.title')" @close="emit('close')">
    <h3 class="mb-3 font-semibold">
      {{ playlistName }}
    </h3>

    <div class="grid grid-cols-2 gap-3">
      <div class="card-surface p-3 text-center">
        <div class="text-xl font-semibold">
          {{ stats.total }}
        </div>
        <div class="text-xs text-base-content/60">{{ $t('stats.totalSentences') }}</div>
      </div>
      <div class="card-surface p-3 text-center">
        <div class="text-xl font-semibold">
          {{ stats.active }}
        </div>
        <div class="text-xs text-base-content/60">{{ $t('stats.active') }}</div>
      </div>
      <div class="card-surface p-3 text-center">
        <div class="text-xl font-semibold">
          {{ stats.mastered }}
        </div>
        <div class="text-xs text-base-content/60">{{ $t('stats.mastered') }}</div>
      </div>
      <div class="card-surface p-3 text-center">
        <div class="text-xl font-semibold">
          {{ stats.avg }}
        </div>
        <div class="text-xs text-base-content/60">{{ $t('stats.avgSuccesses') }}</div>
      </div>
    </div>

    <p class="mt-3 text-xs text-base-content/60">{{ $t('stats.masteredNote') }}</p>
  </BaseModal>
</template>
