<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import DialogHost from '@/components/ui/DialogHost.vue';
import ToastHost from '@/components/ui/ToastHost.vue';
import { useTheme } from '@/composables/useTheme';

const { initTheme } = useTheme();

onMounted(() => {
  initTheme();
});
</script>

<template>
  <RouterView />
  <DialogHost />
  <ToastHost />
</template>
