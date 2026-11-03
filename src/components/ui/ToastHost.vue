<script setup lang="ts">
import { useToast, type ToastType } from '@/composables/useToast';

const { toasts } = useToast();

function alertClass(type: ToastType): string {
  switch (type) {
    case 'success':
      return 'alert-success';
    case 'error':
      return 'alert-error';
    case 'warning':
      return 'alert-warning';
    default:
      return 'alert-info';
  }
}
</script>

<template>
  <div class="toast toast-end toast-bottom z-[10000]">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="alert shadow-lg"
      :class="alertClass(toast.type)"
    >
      <span>{{ toast.message }}</span>
    </div>
  </div>
</template>
