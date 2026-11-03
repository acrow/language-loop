import { reactive } from 'vue';

export type DialogMode = 'alert' | 'confirm' | 'prompt';

export interface DialogState {
  visible: boolean;
  title: string;
  message: string;
  mode: DialogMode;
  inputValue: string;
  resolve: ((value: unknown) => void) | null;
}

const state = reactive<DialogState>({
  visible: false,
  title: '',
  message: '',
  mode: 'alert',
  inputValue: '',
  resolve: null
});

function open(
  mode: DialogMode,
  message: string,
  title: string,
  defaultValue = ''
): Promise<unknown> {
  return new Promise((resolve) => {
    state.visible = true;
    state.mode = mode;
    state.title = title;
    state.message = message;
    state.inputValue = defaultValue;
    state.resolve = resolve;
  });
}

export function useDialog() {
  function handleOk(): void {
    if (!state.resolve) return;
    const value = state.mode === 'prompt' ? state.inputValue : true;
    state.resolve(value);
    state.resolve = null;
    state.visible = false;
  }

  function handleCancel(): void {
    if (!state.resolve) return;
    state.resolve(state.mode === 'prompt' ? null : false);
    state.resolve = null;
    state.visible = false;
  }

  return {
    state,
    alert: (message: string, title = 'Notice') => open('alert', message, title),
    confirm: (message: string, title = 'Confirm') => open('confirm', message, title),
    prompt: (message: string, title = 'Input', defaultValue = '') =>
      open('prompt', message, title, defaultValue),
    handleOk,
    handleCancel
  };
}
