// IndexedDB Storage Manager
const DB_NAME = 'LanguageLoopDB';
const DB_VERSION = 2;

/**
 * @typedef {Object} PlaylistSettings
 * @property {number} repeatCount
 * @property {number} pauseDuration
 * @property {number} speechRate
 * @property {string} preferredVoice
 * @property {boolean} speakNative
 */

/**
 * @typedef {Object} Playlist
 * @property {number} [id]
 * @property {string} cloudId
 * @property {number} version
 * @property {string} name
 * @property {string} icon
 * @property {string} description
 * @property {string} targetLang
 * @property {string} nativeLang
 * @property {number|null} groupId
 * @property {number} createdAt
 * @property {number|null} lastPlayedAt
 * @property {PlaylistSettings} settings
 */

/**
 * @typedef {Object} Sentence
 * @property {number} [id]
 * @property {number} playlistId
 * @property {string} targetText
 * @property {string} nativeText
 * @property {string} memo
 * @property {string} targetLang
 * @property {string} nativeLang
 * @property {Blob|null} customAudio
 * @property {number} order
 * @property {boolean} [disabled]
 * @property {number} [successCount]
 */

class StorageManager {
    constructor() {
        this.db = null;
    }

    async init() {
        if (!('indexedDB' in window)) {
            return Promise.reject(new Error(
                'IndexedDB is not available in this browser. Private/incognito mode may block local storage.'
            ));
        }

        return new Promise((resolve, reject) => {
            let request;
            try {
                request = indexedDB.open(DB_NAME, DB_VERSION);
            } catch (e) {
                reject(new Error('Could not open the local database: ' + e.message));
                return;
            }

            request.onerror = () => reject(request.error || new Error('Failed to open the local database.'));
            request.onblocked = () => reject(new Error(
                'The local database is blocked by another open tab. Please close other tabs and retry.'
            ));
            request.onsuccess = () => {
                this.db = request.result;
                // If another tab upgrades the DB, close this connection so it can proceed.
                this.db.onversionchange = () => {
                    this.db.close();
                    this.db = null;
                };
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

                // v2: Create groups store
                if (!db.objectStoreNames.contains('groups')) {
                    const groupStore = db.createObjectStore('groups', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    groupStore.createIndex('order', 'order', { unique: false });
                }
            };
        });
    }

    generateId() {
        return 'playlist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Playlist Operations
    async createPlaylist(name, targetLang = 'en-US', nativeLang = 'zh-CN', icon = '📚', description = '', groupId = null) {
        const playlist = {
            cloudId: this.generateId(),
            version: 1,
            name,
            icon,
            description,
            targetLang,
            nativeLang,
            groupId: groupId || null,
            createdAt: Date.now(),
            lastPlayedAt: null,
            settings: { ...DEFAULT_PLAYLIST_SETTINGS }
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
        // Ensure successCount is initialized
        if (sentence.successCount === undefined) {
            sentence.successCount = 0;
        }

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
                // Sort by explicit display order (ascending), falling back to id.
                resolve(LanguageLoopLogic.sortSentencesByOrder(request.result));
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

    async getAllSettings() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
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

    async saveGroupOrder(orderedGroupIds) {
        return this.setSetting('groupOrder', orderedGroupIds);
    }

    async getGroupOrder() {
        return this.getSetting('groupOrder', null);
    }

    // Group Operations
    async createGroup(name, icon = '📁', color = null) {
        const allGroups = await this.getAllGroups();
        const group = {
            name,
            icon,
            color,
            order: allGroups.length,
            collapsed: false,
            createdAt: Date.now()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['groups'], 'readwrite');
            const store = transaction.objectStore('groups');
            const request = store.add(group);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllGroups() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['groups'], 'readonly');
            const store = transaction.objectStore('groups');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async getGroup(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['groups'], 'readonly');
            const store = transaction.objectStore('groups');
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateGroup(id, updates) {
        const group = await this.getGroup(id);
        const updatedGroup = { ...group, ...updates };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['groups'], 'readwrite');
            const store = transaction.objectStore('groups');
            const request = store.put(updatedGroup);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteGroup(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['groups'], 'readwrite');
            const store = transaction.objectStore('groups');
            const request = store.delete(id);

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
                speechRate: s.speechRate !== undefined ? s.speechRate : null,
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
                speechRate: sentence.speechRate !== undefined ? sentence.speechRate : null,
                disabled: sentence.disabled || false,
                successCount: sentence.successCount || 0,
                // Always assign a contiguous order based on the (already ordered)
                // source array so imported playlists never contain gaps/duplicates.
                order: index
            });
        });

        await Promise.all(sentencePromises);
        return playlistId;
    }

    // Full backup: all playlists, sentences (with audio), groups, and settings
    async exportAll() {
        const playlists = await this.getAllPlaylists();
        const groups = await this.getAllGroups();
        const settings = await this.getAllSettings();

        const sentences = [];
        for (const playlist of playlists) {
            const list = await this.getSentencesByPlaylist(playlist.id);
            for (const sentence of list) {
                if (sentence.customAudio) {
                    const base64 = await this.blobToBase64(sentence.customAudio);
                    sentences.push({ ...sentence, customAudio: base64 });
                } else {
                    sentences.push(sentence);
                }
            }
        }

        return {
            format: 'language-loop-backup',
            version: 1,
            exportedAt: Date.now(),
            playlists,
            sentences,
            groups,
            settings
        };
    }

    async _clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Restore a full backup produced by exportAll(). Replaces all local data.
    async importAll(data) {
        if (!data || data.format !== 'language-loop-backup') {
            throw new Error('Invalid backup file. Expected a Language Loop backup.');
        }

        // Clear existing data first
        await this._clearStore('sentences');
        await this._clearStore('playlists');
        await this._clearStore('groups');
        await this._clearStore('settings');

        // Restore settings
        for (const setting of (data.settings || [])) {
            await this.setSetting(setting.key, setting.value);
        }

        // Restore groups (preserve ids so playlist.groupId references stay valid)
        for (const group of (data.groups || [])) {
            await new Promise((resolve, reject) => {
                const tx = this.db.transaction(['groups'], 'readwrite');
                const req = tx.objectStore('groups').put(group);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        }

        // Restore playlists (preserve ids)
        for (const playlist of (data.playlists || [])) {
            await new Promise((resolve, reject) => {
                const tx = this.db.transaction(['playlists'], 'readwrite');
                const req = tx.objectStore('playlists').put(playlist);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        }

        // Restore sentences (preserve ids + playlistId references, decode audio)
        for (const sentence of (data.sentences || [])) {
            let customAudio = null;
            if (sentence.customAudio) {
                customAudio = await this.base64ToBlob(sentence.customAudio);
            }
            await new Promise((resolve, reject) => {
                const tx = this.db.transaction(['sentences'], 'readwrite');
                const req = tx.objectStore('sentences').put({ ...sentence, customAudio });
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        }

        return {
            playlists: (data.playlists || []).length,
            sentences: (data.sentences || []).length,
            groups: (data.groups || []).length
        };
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

    // Migration: Ensure all playlists have settings, cloudId, and version and sentences have successCount
    async migratePlaylistSettings() {
        const playlists = await this.getAllPlaylists();
        const defaultSettings = { ...DEFAULT_PLAYLIST_SETTINGS };

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

            // Migrate sentences inside this playlist
            const sentences = await this.getSentencesByPlaylist(playlist.id);
            for (const sentence of sentences) {
                if (sentence.successCount === undefined) {
                    await this.updateSentence(sentence.id, { successCount: 0 });
                }
            }
        }
    }
}

// Create global instance
const storage = new StorageManager();
