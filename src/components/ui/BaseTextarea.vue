<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string;
    label?: string;
    placeholder?: string;
    rows?: number;
    hint?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
  }>(),
  {
    modelValue: '',
    label: '',
    placeholder: '',
    rows: 3,
    hint: '',
    error: '',
    required: false,
    disabled: false
  }
);

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();
</script>

<template>
  <label class="form-control w-full">
    <div v-if="label" class="label">
      <span class="label-text">{{ label }}</span>
    </div>

    <textarea
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :required="required"
      :disabled="disabled"
      class="textarea textarea-bordered w-full"
      :class="{ 'textarea-error': error }"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />

    <div v-if="hint || error" class="label">
      <span class="label-text-alt" :class="error ? 'text-error' : 'text-base-content/60'">
        {{ error || hint }}
      </span>
    </div>
  </label>
</template>
