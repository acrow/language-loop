<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import AppIcon from '@/components/ui/AppIcon.vue';
import ThemeSelector from '@/components/ui/ThemeSelector.vue';
import { useSettingsStore } from '@/stores/settings';
import { LANGUAGES } from '@/constants/languages';

const router = useRouter();
const settings = useSettingsStore();

const showTheme = ref(false);
const languageOptions = LANGUAGES.map((l) => ({ value: l.code, label: l.name }));

onMounted(async () => {
  await settings.loadSettings();
});

function getStarted(): void {
  router.push('/library');
}
</script>

<template>
  <div class="app-shell relative flex min-h-screen items-center justify-center p-6">
    <div class="w-full max-w-md text-center">
      <div class="mx-auto mb-4 flex justify-center">
        <img
          src="/assets/icons/icon-192.png"
          alt="Language Loop Logo"
          class="h-24 w-24 rounded-2xl animate-spin-slow"
        />
      </div>
      <h1 class="text-4xl font-bold text-primary">Language Loop</h1>
      <p class="mt-2 text-base-content/70">
        {{ $t('welcome.welcome-subtitle') }}
      </p>

      <div class="card-surface mt-8 divide-y divide-base-300 text-left">
        <div class="flex items-start gap-3 p-3">
          <span class="mt-0.5 text-primary"><AppIcon name="writing" :size="20" /></span>
          <div>
            <h3 class="text-sm font-semibold">
              {{ $t('welcome.step1-title') }}
            </h3>
            <p class="text-xs text-base-content/60">
              {{ $t('welcome.step1-desc') }}
            </p>
          </div>
        </div>
        <div class="flex items-start gap-3 p-3">
          <span class="mt-0.5 text-primary"><AppIcon name="volume" :size="20" /></span>
          <div>
            <h3 class="text-sm font-semibold">
              {{ $t('welcome.step2-title') }}
            </h3>
            <p class="text-xs text-base-content/60">
              {{ $t('welcome.step2-desc') }}
            </p>
          </div>
        </div>
        <div class="flex items-start gap-3 p-3">
          <span class="mt-0.5 text-primary"><AppIcon name="repeat" :size="20" /></span>
          <div>
            <h3 class="text-sm font-semibold">
              {{ $t('welcome.step3-title') }}
            </h3>
            <p class="text-xs text-base-content/60">
              {{ $t('welcome.step3-desc') }}
            </p>
          </div>
        </div>
      </div>

      <div class="card-surface mt-6 space-y-3 p-4 text-left">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-base-content/60">
            {{ $t('welcome.languageSettings') }}
          </h3>
          <BaseButton variant="icon" title="Change Theme" @click="showTheme = true">
            <AppIcon name="palette" :size="18" />
          </BaseButton>
        </div>
        <div class="grid grid-cols-2 items-end gap-3">
          <BaseSelect
            :model-value="settings.globalTargetLang"
            :label="$t('welcome.targetLanguage')"
            :options="languageOptions"
            @update:model-value="settings.setGlobalTargetLang"
          />
          <BaseSelect
            :model-value="settings.interfaceLanguage"
            :label="$t('welcome.interfaceLanguage')"
            :options="languageOptions"
            @update:model-value="settings.setInterfaceLanguage"
          />
        </div>
      </div>

      <BaseButton variant="primary" full-width class="mt-6" @click="getStarted">
        {{ $t('welcome.start') }}
      </BaseButton>
    </div>

    <ThemeSelector :open="showTheme" @close="showTheme = false" />
  </div>
</template>
