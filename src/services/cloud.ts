// Cloud Sync Service — Firebase Firestore + Google Auth.
// Ported from the legacy `js/cloud.js` to the Firebase v12 modular SDK.

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  type Firestore
} from 'firebase/firestore';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User
} from 'firebase/auth';
import type {
  CloudGroupDoc,
  CloudGroupListItem,
  CloudPlaylistDoc,
  CloudPlaylistListItem
} from '@/types/cloud';
import type { ExportPlaylist, Group } from '@/types/models';

const firebaseConfig = {
  apiKey: 'AIzaSyBXaRSbwJiNDs4u03w949LxVseskL6k6vA',
  authDomain: 'language-loop-acrow.firebaseapp.com',
  projectId: 'language-loop-acrow',
  storageBucket: 'language-loop-acrow.firebasestorage.app',
  messagingSenderId: '589008088102',
  appId: '1:589008088102:web:b002296990f691fd46cae7',
  measurementId: 'G-2MWSE1LVB4'
};

export class CloudService {
  app!: FirebaseApp;
  db!: Firestore;
  auth!: Auth;
  currentUser: User | null = null;
  ready = false;

  private authChangeCallbacks: ((user: User | null) => void)[] = [];

  constructor() {
    try {
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app);
      this.auth = getAuth(this.app);

      onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user;
        this.authChangeCallbacks.forEach((cb) => cb(user));
      });

      this.ready = true;
    } catch (e) {
      console.error('CloudService init failed:', e);
      this.ready = false;
    }
  }

  onAuthChange(callback: (user: User | null) => void): void {
    this.authChangeCallbacks.push(callback);
    if (this.currentUser !== undefined) {
      callback(this.currentUser);
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async signIn(): Promise<User> {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(this.auth, provider);
    return result.user;
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  // Upload a playlist to Firestore (strips custom audio — text only).
  async uploadPlaylist(exportData: ExportPlaylist): Promise<string> {
    if (!this.currentUser) throw new Error('Not signed in');
    const uid = this.currentUser.uid;

    const cleanSentences = (exportData.sentences || []).map((s) => ({
      targetText: s.targetText || '',
      nativeText: s.nativeText || '',
      memo: s.memo || '',
      targetLang: s.targetLang || '',
      nativeLang: s.nativeLang || '',
      speechRate: s.speechRate !== undefined ? s.speechRate : null,
      order: s.order !== undefined ? s.order : 0
    }));

    const docId = exportData.playlist.cloudId || `playlist_${Date.now()}`;

    const cloudDoc: CloudPlaylistDoc = {
      version: exportData.version || 1,
      playlist: {
        cloudId: docId,
        name: exportData.playlist.name,
        targetLang: exportData.playlist.targetLang,
        nativeLang: exportData.playlist.nativeLang,
        icon: exportData.playlist.icon || '📖',
        description: exportData.playlist.description || '',
        createdAt: exportData.playlist.createdAt || Date.now(),
        groupCloudId: exportData.playlist.groupCloudId ?? null,
        groupName: exportData.playlist.groupName ?? null,
        groupIcon: exportData.playlist.groupIcon ?? null,
        groupColor: exportData.playlist.groupColor ?? null,
        groupOrder: exportData.playlist.groupOrder ?? null
      },
      sentences: cleanSentences,
      uploadedAt: Date.now(),
      uploadedBy: this.currentUser.email || ''
    };

    const ref = doc(this.db, 'users', uid, 'playlists', docId);
    await setDoc(ref, cloudDoc);
    return docId;
  }

  async listPlaylists(): Promise<CloudPlaylistListItem[]> {
    if (!this.currentUser) throw new Error('Not signed in');
    const uid = this.currentUser.uid;
    const colRef = collection(this.db, 'users', uid, 'playlists');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => ({
      docId: d.id,
      ...(d.data() as CloudPlaylistDoc)
    }));
  }

  async getPlaylist(docId: string): Promise<CloudPlaylistListItem> {
    if (!this.currentUser) throw new Error('Not signed in');
    const uid = this.currentUser.uid;
    const ref = doc(this.db, 'users', uid, 'playlists', docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Playlist not found in cloud');
    return { docId: snap.id, ...(snap.data() as CloudPlaylistDoc) };
  }

  async deletePlaylist(docId: string): Promise<void> {
    if (!this.currentUser) throw new Error('Not signed in');
    const uid = this.currentUser.uid;
    const ref = doc(this.db, 'users', uid, 'playlists', docId);
    await deleteDoc(ref);
  }

  // ---------------------------------------------------------------
  // Group operations
  // ---------------------------------------------------------------
  async uploadGroup(group: Group): Promise<string> {
    if (!this.currentUser) throw new Error('Not signed in');
    const uid = this.currentUser.uid;
    const cloudId =
      group.cloudId || `group_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const cloudDoc: CloudGroupDoc = {
      cloudId,
      name: group.name,
      icon: group.icon,
      color: group.color ?? null,
      order: group.order,
      createdAt: group.createdAt,
      uploadedAt: Date.now(),
      uploadedBy: this.currentUser.email || ''
    };

    await setDoc(doc(this.db, 'users', uid, 'groups', cloudId), cloudDoc);
    return cloudId;
  }

  async listGroups(): Promise<CloudGroupListItem[]> {
    if (!this.currentUser) throw new Error('Not signed in');
    const uid = this.currentUser.uid;
    const colRef = collection(this.db, 'users', uid, 'groups');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => ({
      docId: d.id,
      ...(d.data() as CloudGroupDoc)
    }));
  }

  async getGroup(docId: string): Promise<CloudGroupListItem> {
    if (!this.currentUser) throw new Error('Not signed in');
    const uid = this.currentUser.uid;
    const ref = doc(this.db, 'users', uid, 'groups', docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Group not found in cloud');
    return { docId: snap.id, ...(snap.data() as CloudGroupDoc) };
  }

  async deleteGroup(docId: string): Promise<void> {
    if (!this.currentUser) throw new Error('Not signed in');
    const uid = this.currentUser.uid;
    const ref = doc(this.db, 'users', uid, 'groups', docId);
    await deleteDoc(ref);
  }
}

export const cloudService = new CloudService();
