import { defineStore } from 'pinia';
import { ref } from 'vue';

// Lightweight UI state for modal visibility. Toasts and dialogs live in their
// own composables (`useToast`, `useDialog`).
export const useUiStore = defineStore('ui', () => {
  const activeModal = ref<string | null>(null);

  function openModal(id: string): void {
    activeModal.value = id;
  }

  function closeModal(): void {
    activeModal.value = null;
  }

  function isModalOpen(id: string): boolean {
    return activeModal.value === id;
  }

  return { activeModal, openModal, closeModal, isModalOpen };
});
