<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import AppIcon from '@/components/ui/AppIcon.vue';
import { resolveContentIcon } from '@/constants';
import { useCloudStore, type LocalPlaylistSummary } from '@/stores/cloud';
import type { CloudPlaylistListItem } from '@/types/cloud';
import { useToast } from '@/composables/useToast';
import { useDialog } from '@/composables/useDialog';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'synced'): void }>();

const cloud = useCloudStore();
const { showToast } = useToast();
const { confirm } = useDialog();
const { t } = useI18n();

const tab = ref<'local' | 'cloud'>('local');
const busy = ref(false);

const isSignedIn = computed(() => !!cloud.user);

const localTree = computed(() => {
  const groups = cloud.localGroups.map((g) => ({
    group: g,
    playlists: cloud.localPlaylists.filter((p) => p.groupId === g.id)
  }));
  const ungrouped = cloud.localPlaylists.filter(
    (p) => !p.groupId || !cloud.localGroups.some((g) => g.id === p.groupId)
  );
  return { groups, ungrouped };
});

const cloudTree = computed(() => {
  const groups = cloud.cloudGroups.map((g) => ({
    group: g,
    playlists: cloud.cloudPlaylists.filter((p) => p.playlist?.groupCloudId === g.cloudId)
  }));
  const ungrouped = cloud.cloudPlaylists.filter(
    (p) =>
      !p.playlist?.groupCloudId ||
      !cloud.cloudGroups.some((g) => g.cloudId === p.playlist?.groupCloudId)
  );
  return { groups, ungrouped };
});

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    await cloud.ensureService();
    await cloud.loadLocal();
    if (cloud.user) await cloud.loadCloud();
  }
);

async function signIn(): Promise<void> {
  busy.value = true;
  try {
    await cloud.signIn();
    await cloud.loadLocal();
    await cloud.loadCloud();
  } catch (e) {
    showToast(e instanceof Error ? e.message : t('cloud.signInFailed'), 'error');
  } finally {
    busy.value = false;
  }
}

async function signOut(): Promise<void> {
  await cloud.signOut();
}

async function upload(id: number): Promise<void> {
  busy.value = true;
  try {
    await cloud.uploadPlaylist(id);
    showToast(t('cloud.playlistUploaded'));
  } catch (e) {
    showToast(e instanceof Error ? e.message : t('cloud.uploadFailed'), 'error');
  } finally {
    busy.value = false;
  }
}

async function uploadGroupPlaylists(playlists: LocalPlaylistSummary[]): Promise<void> {
  busy.value = true;
  try {
    for (const p of playlists) await cloud.uploadPlaylist(p.id);
    showToast(t('cloud.groupUploaded'));
  } catch (e) {
    showToast(e instanceof Error ? e.message : t('cloud.uploadFailed'), 'error');
  } finally {
    busy.value = false;
  }
}

async function uploadAll(): Promise<void> {
  busy.value = true;
  try {
    await cloud.uploadAll();
    showToast(t('cloud.allPlaylistsUploaded'));
  } catch (e) {
    showToast(e instanceof Error ? e.message : t('cloud.uploadFailed'), 'error');
  } finally {
    busy.value = false;
  }
}

async function download(docId: string): Promise<void> {
  busy.value = true;
  try {
    await cloud.downloadPlaylist(docId);
    showToast(t('cloud.playlistDownloaded'));
    emit('synced');
  } catch (e) {
    showToast(e instanceof Error ? e.message : t('cloud.downloadFailed'), 'error');
  } finally {
    busy.value = false;
  }
}

async function downloadGroupPlaylists(playlists: CloudPlaylistListItem[]): Promise<void> {
  busy.value = true;
  try {
    for (const d of playlists) await cloud.downloadPlaylist(d.docId);
    showToast(t('cloud.groupDownloaded'));
    emit('synced');
  } catch (e) {
    showToast(e instanceof Error ? e.message : t('cloud.downloadFailed'), 'error');
  } finally {
    busy.value = false;
  }
}

async function downloadAll(): Promise<void> {
  busy.value = true;
  try {
    await cloud.downloadAll();
    showToast(t('cloud.allPlaylistsDownloaded'));
    emit('synced');
  } catch (e) {
    showToast(e instanceof Error ? e.message : t('cloud.downloadFailed'), 'error');
  } finally {
    busy.value = false;
  }
}

async function remove(docId: string, name: string): Promise<void> {
  if (await confirm(t('cloud.deleteConfirm', { name }), t('cloud.deleteCloudPlaylist'))) {
    await cloud.deletePlaylist(docId);
    showToast(t('cloud.deletedFromCloud'));
  }
}

async function removeGroupPlaylists(
  playlists: CloudPlaylistListItem[],
  name: string
): Promise<void> {
  if (await confirm(t('cloud.deleteGroupConfirm', { name }), t('cloud.deleteCloudGroup'))) {
    for (const d of playlists) await cloud.deletePlaylist(d.docId);
    showToast(t('cloud.deletedFromCloud'));
  }
}
</script>

<template>
  <BaseModal :open="open" :title="$t('cloud.title')" max-width="max-w-2xl" @close="emit('close')">
    <div v-if="!isSignedIn" class="text-center">
      <p class="text-sm text-base-content/60">
        {{ $t('cloud.signInPrompt') }}
      </p>
      <BaseButton variant="primary" class="mt-4" :loading="busy" @click="signIn">
        <AppIcon name="key" /> {{ $t('cloud.signInWithGoogle') }}
      </BaseButton>
    </div>

    <div v-else>
      <div class="mb-4 flex items-center justify-between gap-2">
        <span class="truncate text-sm text-base-content/60">
          <AppIcon name="user" :size="16" /> {{ cloud.user?.displayName || cloud.user?.email }}
        </span>
        <BaseButton variant="secondary" size="sm" @click="signOut">
          {{ $t('cloud.signOut') }}
        </BaseButton>
      </div>

      <label class="mb-4 flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          class="checkbox checkbox-sm"
          :checked="cloud.autoSync"
          @change="cloud.setAutoSync(($event.target as HTMLInputElement).checked)"
        />
        <span>{{ $t('cloud.autoSync') }}</span>
      </label>

      <div class="tabs tabs-boxed mb-4">
        <button class="tab" :class="{ 'tab-active': tab === 'local' }" @click="tab = 'local'">
          <AppIcon name="device" :size="16" /> {{ $t('cloud.onThisDevice') }}
        </button>
        <button class="tab" :class="{ 'tab-active': tab === 'cloud' }" @click="tab = 'cloud'">
          <AppIcon name="cloud" :size="16" /> {{ $t('cloud.inTheCloud') }}
        </button>
      </div>

      <!-- Local tree -->
      <div v-if="tab === 'local'">
        <div class="mb-2 flex justify-end">
          <BaseButton variant="secondary" size="sm" :loading="busy" @click="uploadAll">
            <AppIcon name="cloud" :size="16" /> {{ $t('cloud.uploadAll') }}
          </BaseButton>
        </div>
        <div class="space-y-2">
          <div
            v-for="node in localTree.groups"
            :key="node.group.id"
            class="overflow-hidden rounded-lg border border-base-300"
          >
            <div class="flex items-center justify-between gap-2 bg-base-200 px-2 py-1.5">
              <span class="truncate text-sm font-medium">
                {{ resolveContentIcon(node.group.icon) || node.group.icon }} {{ node.group.name }}
              </span>
              <BaseButton
                variant="secondary"
                size="sm"
                :disabled="busy"
                @click="uploadGroupPlaylists(node.playlists)"
              >
                <AppIcon name="cloud" :size="16" /> {{ $t('cloud.upload') }}
              </BaseButton>
            </div>
            <div v-if="node.playlists.length" class="divide-y divide-base-300">
              <div
                v-for="p in node.playlists"
                :key="p.id"
                class="flex items-center justify-between gap-2 py-1.5 pl-6 pr-2"
              >
                <span class="truncate text-sm">
                  {{ resolveContentIcon(p.icon) || p.icon }} {{ p.name }}
                  <span class="text-base-content/50">(v{{ p.version }})</span>
                </span>
                <BaseButton variant="secondary" size="sm" :disabled="busy" @click="upload(p.id)">
                  <AppIcon name="cloud" :size="16" /> {{ $t('cloud.upload') }}
                </BaseButton>
              </div>
            </div>
          </div>

          <div
            v-for="p in localTree.ungrouped"
            :key="p.id"
            class="flex items-center justify-between gap-2 border-b border-base-300 py-2"
          >
            <span class="truncate text-sm">
              {{ resolveContentIcon(p.icon) || p.icon }} {{ p.name }}
              <span class="text-base-content/50">(v{{ p.version }})</span>
            </span>
            <BaseButton variant="secondary" size="sm" :disabled="busy" @click="upload(p.id)">
              <AppIcon name="cloud" :size="16" /> {{ $t('cloud.upload') }}
            </BaseButton>
          </div>

          <p
            v-if="cloud.localPlaylists.length === 0 && cloud.localGroups.length === 0"
            class="text-sm text-base-content/60"
          >
            {{ $t('cloud.noLocalPlaylists') }}
          </p>
        </div>
      </div>

      <!-- Cloud tree -->
      <div v-else>
        <div class="mb-2 flex justify-end gap-2">
          <BaseButton variant="secondary" size="sm" :loading="busy" @click="downloadAll">
            <AppIcon name="download" :size="16" /> {{ $t('cloud.downloadAll') }}
          </BaseButton>
          <BaseButton variant="secondary" size="sm" @click="cloud.loadCloud()">
            <AppIcon name="refresh" :size="16" /> {{ $t('cloud.refresh') }}
          </BaseButton>
        </div>
        <div class="space-y-2">
          <div
            v-for="node in cloudTree.groups"
            :key="node.group.docId"
            class="overflow-hidden rounded-lg border border-base-300"
          >
            <div class="flex items-center justify-between gap-2 bg-base-200 px-2 py-1.5">
              <span class="truncate text-sm font-medium">
                {{ resolveContentIcon(node.group.icon) || node.group.icon }} {{ node.group.name }}
              </span>
              <div class="flex gap-1">
                <BaseButton
                  variant="secondary"
                  size="sm"
                  :disabled="busy"
                  @click="downloadGroupPlaylists(node.playlists)"
                >
                  <AppIcon name="download" :size="16" />
                </BaseButton>
                <BaseButton
                  variant="danger"
                  size="sm"
                  :disabled="busy"
                  @click="removeGroupPlaylists(node.playlists, node.group.name)"
                >
                  <AppIcon name="delete" :size="16" />
                </BaseButton>
              </div>
            </div>
            <div v-if="node.playlists.length" class="divide-y divide-base-300">
              <div
                v-for="d in node.playlists"
                :key="d.docId"
                class="flex items-center justify-between gap-2 py-1.5 pl-6 pr-2"
              >
                <div class="min-w-0">
                  <div class="truncate text-sm">
                    {{ resolveContentIcon(d.playlist?.icon) || d.playlist?.icon }}
                    {{ d.playlist?.name }}
                    <span class="text-base-content/50">(v{{ d.version }})</span>
                  </div>
                  <div class="text-xs text-base-content/50">
                    {{ d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : '' }}
                  </div>
                </div>
                <div class="flex gap-1">
                  <BaseButton
                    variant="secondary"
                    size="sm"
                    :disabled="busy"
                    @click="download(d.docId)"
                  >
                    <AppIcon name="download" :size="16" />
                  </BaseButton>
                  <BaseButton
                    variant="danger"
                    size="sm"
                    :disabled="busy"
                    @click="remove(d.docId, d.playlist?.name || $t('cloud.untitled'))"
                  >
                    <AppIcon name="delete" :size="16" />
                  </BaseButton>
                </div>
              </div>
            </div>
          </div>

          <div
            v-for="d in cloudTree.ungrouped"
            :key="d.docId"
            class="flex items-center justify-between gap-2 border-b border-base-300 py-2"
          >
            <div class="min-w-0">
              <div class="truncate text-sm">
                {{ resolveContentIcon(d.playlist?.icon) || d.playlist?.icon }} {{ d.playlist?.name }}
                <span class="text-base-content/50">(v{{ d.version }})</span>
              </div>
              <div class="text-xs text-base-content/50">
                {{ d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : '' }}
              </div>
            </div>
            <div class="flex gap-1">
              <BaseButton variant="secondary" size="sm" :disabled="busy" @click="download(d.docId)">
                <AppIcon name="download" :size="16" />
              </BaseButton>
              <BaseButton
                variant="danger"
                size="sm"
                :disabled="busy"
                @click="remove(d.docId, d.playlist?.name || $t('cloud.untitled'))"
              >
                <AppIcon name="delete" :size="16" />
              </BaseButton>
            </div>
          </div>

          <p
            v-if="cloud.cloudPlaylists.length === 0 && cloud.cloudGroups.length === 0"
            class="text-sm text-base-content/60"
          >
            {{ $t('cloud.noCloudPlaylists') }}
          </p>
        </div>
      </div>
    </div>
  </BaseModal>
</template>
