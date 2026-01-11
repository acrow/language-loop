// IndexedDB Storage Manager
const DB_NAME = 'LanguageLoopDB';
const DB_VERSION = 1;

class StorageManager {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create playlists store
                if (!db.objectStoreNames.contains('playlists')) {
                    const playlistStore = db.createObjectStore('playlists', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    playlistStore.createIndex('name', 'name', { unique: false });
                }

                // Create sentences store
                if (!db.objectStoreNames.contains('sentences')) {
                    const sentenceStore = db.createObjectStore('sentences', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    sentenceStore.createIndex('playlistId', 'playlistId', { unique: false });
                }

                // Create settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    // Playlist Operations
    async createPlaylist(name, targetLang = 'en-US', nativeLang = 'zh-CN', icon = '📚', description = '') {
        const playlist = {
            name,
            icon,
            description,
            targetLang,
            nativeLang,
            createdAt: Date.now(),
            lastPlayedAt: null,
            settings: {
                repeatCount: 2,
                pauseDuration: 1,
                speechRate: 1.0,
                preferredVoice: '',
                speakNative: false
            }
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['playlists'], 'readwrite');
            const store = transaction.objectStore('playlists');
            const request = store.add(playlist);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllPlaylists() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['playlists'], 'readonly');
            const store = transaction.objectStore('playlists');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getPlaylist(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['playlists'], 'readonly');
            const store = transaction.objectStore('playlists');
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updatePlaylist(id, updates) {
        const playlist = await this.getPlaylist(id);
        const updatedPlaylist = { ...playlist, ...updates };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['playlists'], 'readwrite');
            const store = transaction.objectStore('playlists');
            const request = store.put(updatedPlaylist);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deletePlaylist(id) {
        // Delete playlist and all its sentences
        await this.deleteSentencesByPlaylist(id);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['playlists'], 'readwrite');
            const store = transaction.objectStore('playlists');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Sentence Operations
    async createSentence(sentence) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sentences'], 'readwrite');
            const store = transaction.objectStore('sentences');
            const request = store.add(sentence);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getSentencesByPlaylist(playlistId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sentences'], 'readonly');
            const store = transaction.objectStore('sentences');
            const index = store.index('playlistId');
            const request = index.getAll(playlistId);

            request.onsuccess = () => {
                const sentences = request.result;
                // Sort by ID descending (newest first)
                sentences.sort((a, b) => b.id - a.id);
                resolve(sentences);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async updateSentence(id, updates) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sentences'], 'readwrite');
            const store = transaction.objectStore('sentences');
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const sentence = getRequest.result;
                const updatedSentence = { ...sentence, ...updates };
                const putRequest = store.put(updatedSentence);

                putRequest.onsuccess = () => resolve(putRequest.result);
                putRequest.onerror = () => reject(putRequest.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async deleteSentence(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sentences'], 'readwrite');
            const store = transaction.objectStore('sentences');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async deleteSentencesByPlaylist(playlistId) {
        const sentences = await this.getSentencesByPlaylist(playlistId);
        const deletePromises = sentences.map(s => this.deleteSentence(s.id));
        return Promise.all(deletePromises);
    }

    // Settings Operations
    async getSetting(key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.value : defaultValue);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async setSetting(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key, value });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Export/Import Operations
    async exportPlaylist(playlistId) {
        const playlist = await this.getPlaylist(playlistId);
        const sentences = await this.getSentencesByPlaylist(playlistId);

        // Convert custom audio blobs to base64
        const sentencesWithAudio = await Promise.all(
            sentences.map(async (sentence) => {
                if (sentence.customAudio) {
                    const base64 = await this.blobToBase64(sentence.customAudio);
                    return { ...sentence, customAudio: base64 };
                }
                return sentence;
            })
        );

        const exportData = {
            version: 1,
            playlist: {
                name: playlist.name,
                createdAt: playlist.createdAt
            },
            sentences: sentencesWithAudio.map(s => ({
                targetText: s.targetText,
                nativeText: s.nativeText,
                targetLang: s.targetLang,
                nativeLang: s.nativeLang,
                customAudio: s.customAudio,
                order: s.order
            }))
        };

        return exportData;
    }

    async importPlaylist(jsonData) {
        const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

        // Create new playlist
        const playlistId = await this.createPlaylist(data.playlist.name);

        // Import sentences
        const sentencePromises = data.sentences.map(async (sentence, index) => {
            let customAudio = null;
            if (sentence.customAudio) {
                customAudio = await this.base64ToBlob(sentence.customAudio);
            }

            return this.createSentence({
                playlistId,
                targetText: sentence.targetText,
                nativeText: sentence.nativeText,
                targetLang: sentence.targetLang,
                nativeLang: sentence.nativeLang,
                customAudio,
                order: sentence.order !== undefined ? sentence.order : index
            });
        });

        await Promise.all(sentencePromises);
        return playlistId;
    }

    // Helper methods
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    base64ToBlob(base64) {
        return fetch(base64).then(res => res.blob());
    }

    // Migration: Ensure all playlists have settings
    async migratePlaylistSettings() {
        const playlists = await this.getAllPlaylists();
        const defaultSettings = {
            repeatCount: 2,
            pauseDuration: 1,
            speechRate: 1.0,
            preferredVoice: '',
            speakNative: false
        };

        for (const playlist of playlists) {
            if (!playlist.settings) {
                await this.updatePlaylist(playlist.id, {
                    settings: defaultSettings
                });
            }
        }
    }
}

// Create global instance
const storage = new StorageManager();
