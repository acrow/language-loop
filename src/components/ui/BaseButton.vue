<script setup lang="ts">
import { computed } from 'vue';

type Variant = 'primary' | 'secondary' | 'ghost' | 'small' | 'icon' | 'control' | 'play' | 'danger';

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    size?: 'sm' | 'md' | 'lg';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    loading?: boolean;
    block?: boolean;
    fullWidth?: boolean;
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false,
    block: false,
    fullWidth: false
  }
);

const emit = defineEmits<{ (e: 'click', event: MouseEvent): void }>();

const classes = computed(() => {
  const base: string[] = ['btn'];

  switch (props.variant) {
    case 'primary':
      base.push('btn-primary');
      break;
    case 'secondary':
      base.push('btn-secondary');
      break;
    case 'ghost':
      base.push('btn-ghost');
      break;
    case 'small':
      base.push('btn-sm', 'btn-primary');
      break;
    case 'icon':
      base.push('btn-circle', 'btn-ghost');
      break;
    case 'control':
      base.push('btn-circle', 'btn-ghost');
      break;
    case 'play':
      base.push('btn-circle', 'btn-primary');
      break;
    case 'danger':
      base.push('btn-error');
      break;
  }

  if (props.size === 'sm' && props.variant !== 'small') base.push('btn-sm');
  if (props.size === 'lg') base.push('btn-lg');
  if (props.block) base.push('btn-block');
  if (props.fullWidth) base.push('w-full');
  if (props.loading) base.push('loading');

  return base;
});

function onClick(event: MouseEvent): void {
  if (!props.disabled && !props.loading) emit('click', event);
}
</script>

<template>
  <button :type="type" :class="classes" :disabled="disabled || loading" @click="onClick">
    <slot />
  </button>
</template>
