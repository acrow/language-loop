<script setup lang="ts">
import { useDialog } from '@/composables/useDialog';

const { state, handleOk, handleCancel } = useDialog();
</script>

<template>
  <div v-if="state.visible" class="modal modal-open z-[9999]">
    <div class="modal-box max-w-md">
      <h3 class="text-lg font-semibold">
        {{ state.title }}
      </h3>
      <p class="py-4 whitespace-pre-line text-base-content/80">
        {{ state.message }}
      </p>

      <input
        v-if="state.mode === 'prompt'"
        v-model="state.inputValue"
        type="text"
        class="input input-bordered w-full"
        @keyup.enter="handleOk"
      />

      <div class="modal-action">
        <button v-if="state.mode !== 'alert'" class="btn btn-ghost" @click="handleCancel">
          Cancel
        </button>
        <button class="btn btn-primary" @click="handleOk">
          {{ state.mode === 'confirm' ? 'Confirm' : 'OK' }}
        </button>
      </div>
    </div>
  </div>
</template>
