<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppIcon from '@/components/ui/AppIcon.vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    maxWidth?: string;
    closeOnBackdrop?: boolean;
  }>(),
  {
    title: '',
    maxWidth: 'max-w-lg',
    closeOnBackdrop: true
  }
);

const emit = defineEmits<{ (e: 'close'): void }>();
const modalRef = ref<HTMLElement | null>(null);

function onKeydown(event: KeyboardEvent): void {
  if (!props.open) return;

  if (event.key === 'Escape') {
    event.stopPropagation();
    emit('close');
    return;
  }

  if (event.key !== 'Tab' || !modalRef.value) return;

  const focusable = modalRef.value.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function onBackdropClick(event: MouseEvent): void {
  if (props.closeOnBackdrop && event.target === event.currentTarget) {
    emit('close');
  }
}

function syncBodyScroll(open: boolean): void {
  document.body.style.overflow = open ? 'hidden' : '';
}

watch(
  () => props.open,
  (open) => syncBodyScroll(open),
  { immediate: true }
);

onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <div v-if="open" class="modal modal-open z-[1000]" @click="onBackdropClick">
    <div ref="modalRef" class="modal-box" :class="maxWidth">
      <div class="mb-4 flex items-center justify-between gap-3">
        <h3 class="text-lg font-semibold">
          {{ title }}
        </h3>
        <button
          type="button"
          class="btn btn-circle btn-ghost btn-sm"
          aria-label="Close"
          @click="emit('close')"
        >
          <AppIcon name="close" :size="18" />
        </button>
      </div>

      <slot />

      <div v-if="$slots.footer" class="modal-action">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>
