<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string | number;
    label?: string;
    type?: string;
    placeholder?: string;
    hint?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
  }>(),
  {
    modelValue: '',
    label: '',
    type: 'text',
    placeholder: '',
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

    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      class="input input-bordered w-full"
      :class="{ 'input-error': error }"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />

    <div v-if="hint || error" class="label">
      <span class="label-text-alt" :class="error ? 'text-error' : 'text-base-content/60'">
        {{ error || hint }}
      </span>
    </div>
  </label>
</template>
