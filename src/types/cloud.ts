// Firestore document shapes for cloud sync.

export interface CloudSentence {
  targetText: string;
  nativeText: string;
  memo: string;
  targetLang: string;
  nativeLang: string;
  speechRate: number | null;
  order: number;
}

export interface CloudPlaylistDoc {
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
  sentences: CloudSentence[];
  uploadedAt: number;
  uploadedBy: string;
}

export interface CloudPlaylistListItem extends CloudPlaylistDoc {
  docId: string;
}

export interface CloudGroupDoc {
  cloudId: string;
  name: string;
  icon: string;
  color: string | null;
  order: number;
  createdAt: number;
  uploadedAt: number;
  uploadedBy: string;
}

export interface CloudGroupListItem extends CloudGroupDoc {
  docId: string;
}
