<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppHeader from '@/components/layout/AppHeader.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import AppIcon from '@/components/ui/AppIcon.vue';
import PlaylistGrid from '@/components/playlist/PlaylistGrid.vue';
import CreatePlaylistModal from '@/components/editor/CreatePlaylistModal.vue';
import CreateGroupModal from '@/components/editor/CreateGroupModal.vue';
import PlaylistEditor from '@/components/editor/PlaylistEditor.vue';
import CloudSyncModal from '@/components/cloud/CloudSyncModal.vue';
import { usePlaylistsStore } from '@/stores/playlists';
import { useGroupsStore } from '@/stores/groups';
import { storage } from '@/services/storage';
import { useToast } from '@/composables/useToast';
import { useDialog } from '@/composables/useDialog';
import { LANGUAGES } from '@/constants/languages';
import type { Group, Playlist } from '@/types/models';

const router = useRouter();
const { t } = useI18n();
const playlists = usePlaylistsStore();
const groups = useGroupsStore();
const { showToast } = useToast();
const { confirm } = useDialog();

const searchTerm = ref('');
const counts = ref<Record<number, number>>({});
const showCreatePlaylist = ref(false);
const showCreateGroup = ref(false);
const showEditGroup = ref(false);
const editingGroup = ref<Group | null>(null);
const showMenu = ref(false);
const showCloud = ref(false);
const showEditPlaylist = ref(false);
const editingPlaylist = ref<Playlist | null>(null);

const importFileInput = ref<HTMLInputElement | null>(null);
const importTextFileInput = ref<HTMLInputElement | null>(null);
const showImportText = ref(false);
const pendingTextFile = ref<File | null>(null);
const importTargetLang = ref('en-US');
const importNativeLang = ref('zh-CN');
const importing = ref(false);

const languageOptions = LANGUAGES.map((l) => ({ value: l.code, label: l.name }));

const empty = computed(() => playlists.playlists.length === 0 && groups.groups.length === 0);

async function load(): Promise<void> {
  await Promise.all([playlists.loadPlaylists(), groups.loadGroups()]);
  const entries = await Promise.all(
    playlists.playlists.map(async (p) => {
      const id = p.id as number;
      return [id, await playlists.getSentenceCount(id)] as const;
    })
  );
  counts.value = Object.fromEntries(entries);
}

onMounted(load);

function editGroup(group: Group): void {
  editingGroup.value = group;
  showEditGroup.value = true;
}

async function deleteGroup(group: Group): Promise<void> {
  const inGroup = playlists.playlists.filter((p) => p.groupId === group.id);
  if (inGroup.length > 0) {
    showToast(
      `Cannot delete "${group.name}" — it still has ${inGroup.length} playlist(s)`,
      'warning'
    );
    return;
  }
  if (await confirm(`Delete group "${group.name}"?`, 'Confirm Delete')) {
    await groups.deleteGroup(group.id as number);
    await load();
    showToast('Group deleted');
  }
}

function onCreated(id: number): void {
  router.push({ name: 'player', params: { id } });
}

function editPlaylist(playlist: Playlist): void {
  editingPlaylist.value = playlist;
  showEditPlaylist.value = true;
}

async function deletePlaylist(playlist: Playlist): Promise<void> {
  if (await confirm(`Delete playlist "${playlist.name}"?`, 'Confirm Delete')) {
    await playlists.deletePlaylist(playlist.id as number);
    await load();
    showToast('Playlist deleted');
  }
}

async function duplicatePlaylist(playlist: Playlist): Promise<void> {
  await playlists.duplicatePlaylist(playlist.id as number);
  await load();
  showToast('Playlist duplicated');
}

async function resetSystem(): Promise<void> {
  showMenu.value = false;
  const ok = await confirm(
    t('playlist.initializeSystemConfirm'),
    t('playlist.initializeSystemMenu')
  );
  if (!ok) return;
  await storage.resetAll();
  window.location.reload();
}

async function movePlaylist(payload: {
  playlistId: number;
  groupId: number | null;
}): Promise<void> {
  await groups.movePlaylistToGroup(payload.playlistId, payload.groupId);
  await load();
  showToast(payload.groupId ? 'Playlist moved into group' : 'Playlist removed from group');
}

async function reorderPlaylists(payload: {
  sourceId: number;
  targetId: number;
}): Promise<void> {
  await playlists.reorderPlaylists(payload.sourceId, payload.targetId);
}

function triggerImportPlaylist(): void {
  showMenu.value = false;
  importFileInput.value?.click();
}

async function handleImportPlaylist(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  try {
    const autoTranslate = Boolean(
      await confirm(
        'Auto-translate any missing translations in this playlist?',
        'Import Playlist'
      )
    );
    await playlists.importPlaylist(file, autoTranslate);
    await load();
    showToast('Playlist imported');
  } catch (error) {
    console.error(error);
    showToast(error instanceof Error ? error.message : 'Import failed', 'error');
  }
}

function triggerImportText(): void {
  showMenu.value = false;
  importTextFileInput.value?.click();
}

function handleImportTextFile(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  pendingTextFile.value = file;
  showImportText.value = true;
}

async function confirmImportText(): Promise<void> {
  if (!pendingTextFile.value) return;
  importing.value = true;
  try {
    await playlists.importFromText(
      pendingTextFile.value,
      importTargetLang.value,
      importNativeLang.value
    );
    await load();
    showToast('Playlist imported from text');
    showImportText.value = false;
    pendingTextFile.value = null;
  } catch (error) {
    console.error(error);
    showToast(error instanceof Error ? error.message : 'Import failed', 'error');
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <div class="app-shell">
    <AppHeader>
      <template #left>
        <BaseButton variant="icon" :title="$t('common.home')" @click="router.push({ name: 'welcome' })">
          <AppIcon name="home" />
        </BaseButton>
      </template>
      <template #default>
        <span class="inline-flex items-center gap-2">
          <span class="text-lg leading-none">🎧</span>
          {{ $t('playlist.playlists') }}
        </span>
      </template>
      <template #actions>
        <BaseButton variant="icon" :title="$t('playlist.libraryMenu')" @click="showMenu = !showMenu">
          <AppIcon name="more" />
        </BaseButton>
      </template>
    </AppHeader>

    <div class="p-4">
      <input
        v-model="searchTerm"
        type="search"
        class="input input-bordered w-full"
        :placeholder="$t('playlist.playlists')"
      />
    </div>

    <BaseModal :open="showMenu" :title="$t('playlist.playlists')" max-width="max-w-sm" @close="showMenu = false">
      <div class="space-y-1">
        <button
          class="btn btn-ghost w-full justify-start"
          @click="
            showCreatePlaylist = true;
            showMenu = false;
          "
        >
          <AppIcon name="plus" /> {{ $t('playlist.createPlaylist') }}
        </button>
        <button
          class="btn btn-ghost w-full justify-start"
          @click="
            showCreateGroup = true;
            showMenu = false;
          "
        >
          <AppIcon name="folder" /> {{ $t('playlist.createGroupMenu') }}
        </button>
        <button class="btn btn-ghost w-full justify-start" @click="triggerImportPlaylist">
          <AppIcon name="download" /> {{ $t('playlist.importPlaylistMenu') }}
        </button>
        <button class="btn btn-ghost w-full justify-start" @click="triggerImportText">
          <AppIcon name="export-text" /> {{ $t('playlist.importTextMenu') }}
        </button>
        <button
          class="btn btn-ghost w-full justify-start"
          @click="
            showCloud = true;
            showMenu = false;
          "
        >
          <AppIcon name="cloud" /> {{ $t('playlist.cloudSyncMenu') }}
        </button>
        <button class="btn btn-ghost w-full justify-start text-error" @click="resetSystem">
          <AppIcon name="refresh" /> {{ $t('playlist.initializeSystemMenu') }}
        </button>
      </div>
    </BaseModal>

    <input
      ref="importFileInput"
      type="file"
      accept=".json,application/json"
      class="hidden"
      @change="handleImportPlaylist"
    />
    <input
      ref="importTextFileInput"
      type="file"
      accept=".txt,text/plain"
      class="hidden"
      @change="handleImportTextFile"
    />

    <div v-if="empty" class="px-4 py-16 text-center">
      <div class="flex justify-center opacity-50">
        <AppIcon name="music" :size="48" />
      </div>
      <h2 class="mt-4 text-lg font-semibold">
        {{ $t('playlist.noPlaylists') }}
      </h2>
      <p class="mt-1 text-base-content/60">
        {{ $t('playlist.createFirst') }}
      </p>
      <BaseButton variant="primary" class="mt-4" @click="showCreatePlaylist = true">
        {{ $t('playlist.createPlaylist') }}
      </BaseButton>
    </div>

    <div v-else class="px-4 pb-8">
      <PlaylistGrid
        :playlists="playlists.playlists"
        :groups="groups.groups"
        :counts="counts"
        :search-term="searchTerm"
        @edit-group="editGroup"
        @delete-group="deleteGroup"
        @move-playlist="movePlaylist"
        @reorder-playlists="reorderPlaylists"
        @edit-playlist="editPlaylist"
        @delete-playlist="deletePlaylist"
        @duplicate-playlist="duplicatePlaylist"
      />
    </div>

    <CreatePlaylistModal
      :open="showCreatePlaylist"
      @close="showCreatePlaylist = false"
      @created="onCreated"
    />
    <CreateGroupModal :open="showCreateGroup" @close="showCreateGroup = false" @created="load" />
    <CreateGroupModal
      :open="showEditGroup"
      :group="editingGroup"
      @close="showEditGroup = false"
      @saved="load"
    />
    <PlaylistEditor
      :open="showEditPlaylist"
      :playlist="editingPlaylist"
      @close="showEditPlaylist = false"
      @saved="load"
    />
    <BaseModal :open="showImportText" title="Import from Text" @close="showImportText = false">
      <div class="space-y-4">
        <p class="text-sm text-base-content/60">
          Each pair of lines is treated as the target sentence followed by its translation.
        </p>
        <BaseSelect v-model="importTargetLang" label="Target Language" :options="languageOptions" />
        <BaseSelect v-model="importNativeLang" label="Native Language" :options="languageOptions" />
      </div>
      <template #footer>
        <BaseButton variant="ghost" @click="showImportText = false"> Cancel </BaseButton>
        <BaseButton variant="primary" :loading="importing" @click="confirmImportText">
          Import
        </BaseButton>
      </template>
    </BaseModal>
    <CloudSyncModal :open="showCloud" @close="showCloud = false" @synced="load" />
  </div>
</template>
