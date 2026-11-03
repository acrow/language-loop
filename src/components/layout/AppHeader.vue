<script setup lang="ts">
defineProps<{ title?: string }>();
</script>

<template>
  <header
    class="sticky top-0 z-30 flex items-center gap-3 border-b border-base-300 bg-base-100/80 px-4 py-3 backdrop-blur"
  >
    <div class="flex items-center gap-2">
      <slot name="left" />
    </div>

    <h1 class="flex-1 truncate text-center text-base font-semibold">
      <slot>{{ title }}</slot>
    </h1>

    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
