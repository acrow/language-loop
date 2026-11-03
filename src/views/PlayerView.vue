<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppHeader from '@/components/layout/AppHeader.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import AppIcon from '@/components/ui/AppIcon.vue';
import PlayerControls from '@/components/player/PlayerControls.vue';
import SleepTimer from '@/components/player/SleepTimer.vue';
import SentenceList from '@/components/player/SentenceList.vue';
import SentenceEditor from '@/components/editor/SentenceEditor.vue';
import PlaylistSettingsModal from '@/components/editor/PlaylistSettingsModal.vue';
import StudyStatsModal from '@/components/editor/StudyStatsModal.vue';
import { usePlayerStore } from '@/stores/player';
import { usePlaylistsStore } from '@/stores/playlists';
import { useToast } from '@/composables/useToast';
import { useDialog } from '@/composables/useDialog';
import { resolveContentIcon } from '@/constants';
import type { Sentence } from '@/types/models';

const route = useRoute();
const router = useRouter();
const player = usePlayerStore();
const playlists = usePlaylistsStore();
const { showToast } = useToast();
const { confirm } = useDialog();

const showEditor = ref(false);
const editingSentence = ref<Sentence | null>(null);
const showMenu = ref(false);
const showSettings = ref(false);
const showStats = ref(false);
const showOriginalText = ref(true);

const playlistId = computed(() => Number(route.params.id));
const playlist = computed(() => playlists.playlists.find((p) => p.id === playlistId.value));

async function loadPlaylist(): Promise<void> {
  await playlists.loadPlaylists();
  await player.openPlaylist(playlistId.value);
}

onMounted(loadPlaylist);

function openAdd(): void {
  editingSentence.value = null;
  showEditor.value = true;
}

function openEdit(sentence: Sentence): void {
  editingSentence.value = sentence;
  showEditor.value = true;
}

async function toggle(sentence: Sentence): Promise<void> {
  await playlists.updateSentence(sentence.id as number, { disabled: !sentence.disabled });
  await player.openPlaylist(playlistId.value);
}

async function toggleAllSentences(): Promise<void> {
  const sentences = player.sentences;
  if (sentences.length === 0) return;

  const allDisabled = sentences.every((s) => s.disabled);
  const target = !allDisabled;

  await Promise.all(
    sentences.map((s) => playlists.updateSentence(s.id as number, { disabled: target }))
  );
  await player.openPlaylist(playlistId.value);
  showToast(target ? 'All sentences disabled' : 'All sentences enabled');
}

async function remove(sentence: Sentence): Promise<void> {
  if (await confirm('Delete this sentence?', 'Confirm Delete')) {
    await playlists.deleteSentence(sentence.id as number);
    await player.openPlaylist(playlistId.value);
    showToast('Sentence deleted');
  }
}

function back(): void {
  player.stop();
  router.push('/library');
}

function startTest(mode: 'writing' | 'speaking'): void {
  showMenu.value = false;
  router.push({ name: 'test', params: { id: playlistId.value }, query: { mode } });
}

async function exportPlaylist(): Promise<void> {
  showMenu.value = false;
  try {
    await playlists.exportPlaylist(playlistId.value);
    showToast('Playlist exported');
  } catch (error) {
    console.error(error);
    showToast('Failed to export playlist', 'error');
  }
}

async function exportPlaylistAsText(): Promise<void> {
  showMenu.value = false;
  try {
    await playlists.exportPlaylistAsText(playlistId.value);
    showToast('Playlist exported as text');
  } catch (error) {
    console.error(error);
    showToast('Failed to export playlist', 'error');
  }
}

</script>

<template>
  <div class="app-shell">
    <AppHeader :title="playlist?.name || 'Playlist'">
      <template #default>
        <span class="inline-flex min-w-0 items-center justify-center gap-2">
          <span class="shrink-0 text-lg leading-none">
            {{ resolveContentIcon(playlist?.icon) || playlist?.icon || '📚' }}
          </span>
          <span class="truncate">{{ playlist?.name || 'Playlist' }}</span>
        </span>
      </template>
      <template #left>
        <BaseButton variant="icon" title="Back to Library" @click="back">
          <AppIcon name="arrow-left" />
        </BaseButton>
      </template>
      <template #actions>
        <BaseButton variant="icon" title="Playlist Menu" @click="showMenu = !showMenu">
          <AppIcon name="more" />
        </BaseButton>
      </template>
    </AppHeader>

    <BaseModal
      :open="showMenu"
      :title="playlist?.name || 'Menu'"
      max-width="max-w-sm"
      @close="showMenu = false"
    >
      <div class="space-y-1">
        <button
          class="btn btn-ghost w-full justify-start"
          @click="
            showSettings = true;
            showMenu = false;
          "
        >
          <AppIcon name="settings" /> {{ $t('playlist.settingsMenu') }}
        </button>
        <button
          class="btn btn-ghost w-full justify-start"
          @click="
            showStats = true;
            showMenu = false;
          "
        >
          <AppIcon name="stats" /> {{ $t('stats.title') }}
        </button>
        <button class="btn btn-ghost w-full justify-start" @click="startTest('writing')">
          <AppIcon name="writing" /> {{ $t('playlist.writingTestMenu') }}
        </button>
        <button class="btn btn-ghost w-full justify-start" @click="startTest('speaking')">
          <AppIcon name="speaking" /> {{ $t('playlist.speakingTestMenu') }}
        </button>
        <button class="btn btn-ghost w-full justify-start" @click="exportPlaylist">
          <AppIcon name="export" /> {{ $t('playlist.exportPlaylistMenu') }}
        </button>
        <button class="btn btn-ghost w-full justify-start" @click="exportPlaylistAsText">
          <AppIcon name="export-text" /> {{ $t('playlist.exportTextMenu') }}
        </button>
      </div>
    </BaseModal>

    <section class="border-b border-base-300 bg-base-200 px-4 py-8">
      <div class="mx-auto max-w-2xl text-center">
        <div class="text-2xl font-semibold">
          {{ player.currentSentence?.targetText || 'Select a sentence to play' }}
        </div>
        <div class="mt-2 text-base-content/70">
          {{ player.currentSentence?.nativeText }}
        </div>
      </div>

      <div class="mt-6">
        <PlayerControls />
      </div>

      <div class="mt-3 text-center text-sm text-base-content/60">
        {{ player.progress.current }} / {{ player.progress.total }}
      </div>
    </section>

    <section class="mx-auto max-w-3xl px-4 py-4">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-base-content/60">
          {{ $t('sentence.sentences') }}
        </h3>
        <div class="flex flex-wrap items-center gap-2">
          <BaseButton
            v-if="player.isPlaying"
            variant="icon"
            :class="player.shuffleMode ? 'text-primary' : ''"
            :title="player.shuffleMode ? 'Random play: on' : 'Random play: off'"
            @click="player.toggleShuffle()"
          >
            <AppIcon :name="player.shuffleMode ? 'shuffle' : 'list-ordered'" :size="18" />
          </BaseButton>
          <SleepTimer v-if="player.isPlaying" />
          <BaseButton
            v-if="!player.isPlaying"
            variant="icon"
            title="Disable all sentences"
            @click="toggleAllSentences"
          >
            <AppIcon name="ban" :size="18" />
          </BaseButton>
          <BaseButton
            v-if="!player.isPlaying"
            variant="icon"
            :title="showOriginalText ? 'Hide original text' : 'Show original text'"
            @click="showOriginalText = !showOriginalText"
          >
            <AppIcon :name="showOriginalText ? 'eye' : 'eye-off'" :size="18" />
          </BaseButton>
          <BaseButton variant="small" @click="openAdd"> + {{ $t('common.add') }} </BaseButton>
        </div>
      </div>

      <SentenceList
        :sentences="player.sentences"
        :current-index="player.currentIndex"
        :is-playing="player.isPlaying"
        :show-original-text="showOriginalText"
        @play="player.jumpToSentence"
        @edit="openEdit"
        @toggle="toggle"
        @delete="remove"
      />
    </section>

    <SentenceEditor
      :open="showEditor"
      :sentence="editingSentence"
      @close="showEditor = false"
      @saved="loadPlaylist"
    />
    <PlaylistSettingsModal
      :open="showSettings"
      :playlist="playlist || null"
      @close="showSettings = false"
      @saved="loadPlaylist"
    />
    <StudyStatsModal
      :open="showStats"
      :playlist-id="playlistId"
      :playlist-name="playlist?.name || ''"
      @close="showStats = false"
    />
  </div>
</template>
