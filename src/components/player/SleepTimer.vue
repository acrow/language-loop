<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { usePlayerStore } from '@/stores/player';
import AppIcon from '@/components/ui/AppIcon.vue';

const player = usePlayerStore();

const sleepOptions = [0, 15, 30, 45, 60, 90, 120];
const sleepMinutes = ref(0);
const remainingSeconds = ref(0);
let countdownInterval: ReturnType<typeof setInterval> | null = null;

const countdownLabel = computed(() => {
  const total = remainingSeconds.value;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

function stopCountdown(): void {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function updateRemaining(): void {
  remainingSeconds.value = player.getSleepTimerRemainingSeconds();
  if (remainingSeconds.value <= 0) {
    stopCountdown();
    sleepMinutes.value = 0;
  }
}

function startCountdown(): void {
  stopCountdown();
  updateRemaining();
  countdownInterval = setInterval(updateRemaining, 1000);
}

function onSleepChange(): void {
  if (sleepMinutes.value > 0) {
    player.setSleepTimer(sleepMinutes.value);
    startCountdown();
  } else {
    player.clearSleepTimer();
    stopCountdown();
    remainingSeconds.value = 0;
  }
}

onBeforeUnmount(stopCountdown);
</script>

<template>
  <div class="flex items-center gap-2 text-sm">
    <select
      v-model.number="sleepMinutes"
      class="select select-bordered select-xs w-24"
      title="Sleep timer"
      aria-label="Sleep timer"
      @change="onSleepChange"
    >
      <option :value="0">Off</option>
      <option v-for="minutes in sleepOptions.slice(1)" :key="minutes" :value="minutes">
        {{ minutes }} min
      </option>
    </select>
    <span v-if="remainingSeconds > 0" class="inline-flex items-center gap-1 font-mono text-primary">
      <AppIcon name="clock" :size="14" />
      {{ countdownLabel }}
    </span>
  </div>
</template>
