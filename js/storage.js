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

    generateId() {
        return 'playlist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Playlist Operations
    async createPlaylist(name, targetLang = 'en-US', nativeLang = 'zh-CN', icon = '📚', description = '') {
        const playlist = {
            cloudId: this.generateId(),
            version: 1,
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

        // Auto-increment version if playlist properties are explicitly modified
        // and version isn't being manually set (e.g. during import)
        if (updates.version === undefined) {
            updatedPlaylist.version = (updatedPlaylist.version || 1) + 1;
        }

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

            getRequest.onsuccess = async () => {
                const sentence = getRequest.result;
                const updatedSentence = { ...sentence, ...updates };
                const putRequest = store.put(updatedSentence);

                putRequest.onsuccess = async () => {
                    // Update playlist version
                    await this.incrementPlaylistVersion(sentence.playlistId);
                    resolve(putRequest.result);
                };
                putRequest.onerror = () => reject(putRequest.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async incrementPlaylistVersion(id) {
        try {
            await this.updatePlaylist(id, {}); // empty update triggers version increment
        } catch(e) { /* ignore if deleted */ }
    }

    async deleteSentence(id) {
        const sentence = await new Promise((res, rej) => {
            const tx = this.db.transaction(['sentences'], 'readonly');
            const req = tx.objectStore('sentences').get(id);
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
        });

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sentences'], 'readwrite');
            const store = transaction.objectStore('sentences');
            const request = store.delete(id);

            request.onsuccess = async () => {
                if (sentence) {
                    await this.incrementPlaylistVersion(sentence.playlistId);
                }
                resolve();
            };
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

    async deleteSetting(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Playlist Order
    async savePlaylistOrder(orderedIds) {
        return this.setSetting('playlistOrder', orderedIds);
    }

    async getPlaylistOrder() {
        return this.getSetting('playlistOrder', null);
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
            version: playlist.version || 1,
            playlist: {
                cloudId: playlist.cloudId || this.generateId(),
                name: playlist.name,
                targetLang: playlist.targetLang,
                nativeLang: playlist.nativeLang,
                icon: playlist.icon,
                description: playlist.description,
                createdAt: playlist.createdAt
            },
            sentences: sentencesWithAudio.map(s => ({
                targetText: s.targetText,
                nativeText: s.nativeText,
                memo: s.memo || '',
                targetLang: s.targetLang,
                nativeLang: s.nativeLang,
                customAudio: s.customAudio,
                disabled: s.disabled || false,
                order: s.order
            }))
        };

        return exportData;
    }

    async importPlaylist(jsonData) {
        const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        // Fallback to data.docId if this is an older playlist from the cloud
        const cloudId = data.playlist.cloudId || data.docId;

        // Check if playlist with this cloudId already exists
        const allPlaylists = await this.getAllPlaylists();
        let existingPlaylist = cloudId ? allPlaylists.find(p => p.cloudId === cloudId) : null;
        let playlistId;

        if (existingPlaylist) {
            playlistId = existingPlaylist.id;
            await this.updatePlaylist(existingPlaylist.id, {
                version: data.version || 1, // Explicitly set version so it doesn't auto-increment
                name: data.playlist.name,
                targetLang: data.playlist.targetLang,
                nativeLang: data.playlist.nativeLang,
                icon: data.playlist.icon,
                description: data.playlist.description
            });
            // Delete all existing sentences before importing the new ones
            await this.deleteSentencesByPlaylist(existingPlaylist.id);
        } else {
            // Create new playlist
            playlistId = await this.createPlaylist(
                data.playlist.name,
                data.playlist.targetLang,
                data.playlist.nativeLang,
                data.playlist.icon,
                data.playlist.description
            );
            // Overwrite cloudId and version of newly created playlist
            await this.updatePlaylist(playlistId, {
                cloudId: cloudId || this.generateId(),
                version: data.version || 1
            });
        }

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
                memo: sentence.memo || '',
                // Fall back to playlist-level language if sentence-level is missing
                targetLang: sentence.targetLang || data.playlist.targetLang,
                nativeLang: sentence.nativeLang || data.playlist.nativeLang,
                customAudio,
                disabled: sentence.disabled || false,
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

    // Migration: Ensure all playlists have settings, cloudId, and version
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
            let updates = {};
            if (!playlist.settings) {
                updates.settings = defaultSettings;
            }
            if (!playlist.cloudId) {
                updates.cloudId = this.generateId();
                updates.version = 1;
            }
            
            if (Object.keys(updates).length > 0) {
                await this.updatePlaylist(playlist.id, updates);
            }
        }
    }
}

// Create global instance
const storage = new StorageManager();
