// Core domain models for Language Loop.
// These mirror the IndexedDB schema in the legacy `js/storage.js`.

export interface PlaylistSettings {
  repeatCount: number;
  pauseDuration: number;
  speechRate: number;
  preferredVoice: string;
  speakNative: boolean;
}

export interface Playlist {
  id?: number;
  cloudId: string;
  version: number;
  name: string;
  icon: string;
  description: string;
  targetLang: string;
  nativeLang: string;
  groupId: number | null;
  createdAt: number;
  lastPlayedAt: number | null;
  settings: PlaylistSettings;
}

export interface Sentence {
  id?: number;
  playlistId: number;
  targetText: string;
  nativeText: string;
  memo: string;
  targetLang: string;
  nativeLang: string;
  customAudio: Blob | null;
  order: number;
  disabled?: boolean;
  successCount?: number;
  speechRate?: number | null;
}

export interface Group {
  id?: number;
  cloudId?: string;
  name: string;
  icon: string;
  color?: string | null;
  order: number;
  collapsed?: boolean;
  createdAt: number;
}

export interface SettingRecord<T = unknown> {
  key: string;
  value: T;
}

export interface CombinedOrderEntry {
  type: 'group' | 'playlist';
  id: number;
}

export interface AppSettings {
  theme: string;
  interfaceLanguage: string;
  globalTargetLang: string;
  lastPlaylistId?: number | null;
  lastSentenceIndex?: number;
  combinedOrder?: CombinedOrderEntry[];
  [key: string]: unknown;
}

// Serialized shapes used for export / import / cloud sync.
export interface ExportSentence {
  targetText: string;
  nativeText: string;
  memo: string;
  targetLang: string;
  nativeLang: string;
  customAudio: string | Blob | null;
  speechRate: number | null;
  disabled: boolean;
  order: number;
  successCount?: number;
}

export interface ExportPlaylist {
  version: number;
  playlist: {
    cloudId: string;
    name: string;
    targetLang: string;
    nativeLang: string;
    icon: string;
    description: string;
    createdAt: number;
    groupCloudId?: string | null;
    groupName?: string | null;
    groupIcon?: string | null;
    groupColor?: string | null;
    groupOrder?: number | null;
  };
  sentences: ExportSentence[];
}

export interface BackupSentence extends Omit<Sentence, 'customAudio'> {
  customAudio: string | Blob | null;
}

export interface BackupData {
  format: 'language-loop-backup';
  version: number;
  exportedAt: number;
  playlists: Playlist[];
  sentences: BackupSentence[];
  groups: Group[];
  settings: SettingRecord[];
}
