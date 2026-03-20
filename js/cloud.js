// Cloud Sync Service — Firebase Firestore + Google Auth
// Firebase project: language-loop-acrow
//
// Before this works, enable in Firebase Console:
//   1. Authentication → Sign-in method → Google (enable)
//   2. Firestore Database → Create database (test mode is fine to start)

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
    getFirestore,
    collection, doc,
    setDoc, getDocs, getDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBXaRSbwJiNDs4u03w949LxVseskL6k6vA",
    authDomain: "language-loop-acrow.firebaseapp.com",
    projectId: "language-loop-acrow",
    storageBucket: "language-loop-acrow.firebasestorage.app",
    messagingSenderId: "589008088102",
    appId: "1:589008088102:web:b002296990f691fd46cae7",
    measurementId: "G-2MWSE1LVB4"
};

class CloudService {
    constructor() {
        try {
            this.app = initializeApp(firebaseConfig);
            this.db = getFirestore(this.app);
            this.auth = getAuth(this.app);
            this.currentUser = null;
            this._authChangeCallbacks = [];

            onAuthStateChanged(this.auth, (user) => {
                this.currentUser = user;
                this._authChangeCallbacks.forEach(cb => cb(user));
            });

            this.ready = true;
        } catch (e) {
            console.error('CloudService init failed:', e);
            this.ready = false;
        }
    }

    // Register a callback for auth state changes
    onAuthChange(callback) {
        this._authChangeCallbacks.push(callback);
        // Fire immediately with current state
        if (this.currentUser !== undefined) {
            callback(this.currentUser);
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async signIn() {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(this.auth, provider);
        return result.user;
    }

    async signOut() {
        await signOut(this.auth);
    }

    // Upload a playlist to Firestore (strips custom audio — text only)
    // exportData: result of storage.exportPlaylist()
    // Returns the Firestore doc ID
    async uploadPlaylist(exportData) {
        if (!this.currentUser) throw new Error('Not signed in');
        const uid = this.currentUser.uid;

        // Strip binary audio from sentences — Firestore has a 1MB doc limit
        const cleanSentences = (exportData.sentences || []).map(s => ({
            targetText: s.targetText || '',
            nativeText: s.nativeText || '',
            memo: s.memo || '',
            targetLang: s.targetLang || '',
            nativeLang: s.nativeLang || '',
            order: s.order !== undefined ? s.order : 0
            // customAudio intentionally excluded
        }));

        const cloudDoc = {
            version: exportData.version || 1,
            playlist: {
                name: exportData.playlist.name,
                targetLang: exportData.playlist.targetLang,
                nativeLang: exportData.playlist.nativeLang,
                icon: exportData.playlist.icon || '📚',
                description: exportData.playlist.description || '',
                createdAt: exportData.playlist.createdAt || Date.now()
            },
            sentences: cleanSentences,
            uploadedAt: Date.now(),
            uploadedBy: this.currentUser.email || ''
        };

        const docId = `playlist_${Date.now()}`;
        const ref = doc(this.db, 'users', uid, 'playlists', docId);
        await setDoc(ref, cloudDoc);
        return docId;
    }

    // List all cloud playlists for the current user
    async listPlaylists() {
        if (!this.currentUser) throw new Error('Not signed in');
        const uid = this.currentUser.uid;
        const colRef = collection(this.db, 'users', uid, 'playlists');
        const snapshot = await getDocs(colRef);
        return snapshot.docs.map(d => ({ docId: d.id, ...d.data() }));
    }

    // Get a single cloud playlist by doc ID
    async getPlaylist(docId) {
        if (!this.currentUser) throw new Error('Not signed in');
        const uid = this.currentUser.uid;
        const ref = doc(this.db, 'users', uid, 'playlists', docId);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error('Playlist not found in cloud');
        return { docId: snap.id, ...snap.data() };
    }

    // Delete a cloud playlist by doc ID
    async deletePlaylist(docId) {
        if (!this.currentUser) throw new Error('Not signed in');
        const uid = this.currentUser.uid;
        const ref = doc(this.db, 'users', uid, 'playlists', docId);
        await deleteDoc(ref);
    }
}

// Export as global so non-module scripts can access it
window.cloudService = new CloudService();
