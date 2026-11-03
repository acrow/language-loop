import { reactive } from 'vue';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const toasts = reactive<Toast[]>([]);
let nextId = 1;

export function useToast() {
  function showToast(message: string, type: ToastType = 'success', duration = 3000): void {
    const id = nextId++;
    toasts.push({ id, message, type });

    setTimeout(() => {
      const index = toasts.findIndex((t) => t.id === id);
      if (index !== -1) toasts.splice(index, 1);
    }, duration);
  }

  function dismissToast(id: number): void {
    const index = toasts.findIndex((t) => t.id === id);
    if (index !== -1) toasts.splice(index, 1);
  }

  return { toasts, showToast, dismissToast };
}
