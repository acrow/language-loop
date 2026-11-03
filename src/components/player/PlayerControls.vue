<script setup lang="ts">
import { usePlayerStore } from '@/stores/player';
import BaseButton from '@/components/ui/BaseButton.vue';
import AppIcon from '@/components/ui/AppIcon.vue';

const player = usePlayerStore();
</script>

<template>
  <div class="flex items-center justify-center gap-4">
    <BaseButton variant="control" title="Previous" @click="player.previous()">
      <AppIcon name="previous" />
    </BaseButton>
    <BaseButton variant="play" title="Play or pause" @click="player.togglePlayPause()">
      <AppIcon :name="player.isPlaying ? 'pause' : 'play'" />
    </BaseButton>
    <BaseButton variant="control" title="Next" @click="player.next()">
      <AppIcon name="next" />
    </BaseButton>
  </div>
</template>
