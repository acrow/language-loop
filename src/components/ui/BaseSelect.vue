<script setup lang="ts">
export interface SelectOption {
  value: string | number;
  label: string;
}

withDefaults(
  defineProps<{
    modelValue: string | number;
    label?: string;
    options: SelectOption[];
    hint?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
  }>(),
  {
    modelValue: '',
    label: '',
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

    <select
      :value="modelValue"
      :required="required"
      :disabled="disabled"
      class="select select-bordered w-full"
      :class="{ 'select-error': error }"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <div v-if="hint || error" class="label">
      <span class="label-text-alt" :class="error ? 'text-error' : 'text-base-content/60'">
        {{ error || hint }}
      </span>
    </div>
  </label>
</template>
