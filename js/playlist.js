// Playlist Management
class PlaylistManager {
    constructor() {
        this.currentPlaylistId = null;
        this.currentSentences = [];
    }

    async createPlaylist(name, targetLang, nativeLang, icon = '📚', description = '') {
        if (!name || name.trim() === '') {
            throw new Error('Playlist name cannot be empty');
        }

        const id = await storage.createPlaylist(name.trim(), targetLang, nativeLang, icon, description);
        return id;
    }

    async getAllPlaylists() {
        return await storage.getAllPlaylists();
    }

    async getPlaylist(id) {
        return await storage.getPlaylist(id);
    }

    async renamePlaylist(id, newName) {
        if (!newName || newName.trim() === '') {
            throw new Error('Playlist name cannot be empty');
        }

        await storage.updatePlaylist(id, { name: newName.trim() });
    }

    async updatePlaylist(id, updates) {
        await storage.updatePlaylist(id, updates);
    }

    async deletePlaylist(id) {
        await storage.deletePlaylist(id);

        // Clear current playlist if it was deleted
        if (this.currentPlaylistId === id) {
            this.currentPlaylistId = null;
            this.currentSentences = [];
        }
    }

    async loadPlaylist(id) {
        this.currentPlaylistId = id;
        this.currentSentences = await storage.getSentencesByPlaylist(id);

        // Load playlist and apply its settings to audio engine
        const playlist = await storage.getPlaylist(id);
        if (playlist && playlist.settings) {
            audioEngine.setPlaybackSettings(
                playlist.settings.repeatCount,
                playlist.settings.pauseDuration
            );
            audioEngine.speechRate = playlist.settings.speechRate;
            audioEngine.preferredVoiceName = playlist.settings.preferredVoice;
            audioEngine.speakNativeLanguage = playlist.settings.speakNative;
        }

        // Update last played timestamp
        await storage.updatePlaylist(id, { lastPlayedAt: Date.now() });

        return this.currentSentences;
    }

    async addSentence(playlistId, sentenceData) {
        // Get current sentences to determine order
        const sentences = await storage.getSentencesByPlaylist(playlistId);
        const order = sentences.length;

        // Get playlist to use its language settings
        const playlist = await storage.getPlaylist(playlistId);

        const sentence = {
            playlistId,
            targetText: sentenceData.targetText,
            nativeText: sentenceData.nativeText,
            targetLang: playlist.targetLang,
            nativeLang: playlist.nativeLang,
            customAudio: sentenceData.customAudio || null,
            order
        };

        const id = await storage.createSentence(sentence);

        // Reload current playlist if it's the active one
        if (this.currentPlaylistId === playlistId) {
            this.currentSentences = await storage.getSentencesByPlaylist(playlistId);
        }

        return id;
    }

    async updateSentence(id, updates) {
        await storage.updateSentence(id, updates);

        // Reload current playlist
        if (this.currentPlaylistId) {
            this.currentSentences = await storage.getSentencesByPlaylist(this.currentPlaylistId);
        }
    }

    async deleteSentence(id) {
        await storage.deleteSentence(id);

        // Reload and reorder sentences
        if (this.currentPlaylistId) {
            this.currentSentences = await storage.getSentencesByPlaylist(this.currentPlaylistId);
            await this.reorderSentences(this.currentSentences.map(s => s.id));
        }
    }

    async reorderSentences(sentenceIds) {
        const updatePromises = sentenceIds.map((id, index) =>
            storage.updateSentence(id, { order: index })
        );

        await Promise.all(updatePromises);

        // Reload current playlist
        if (this.currentPlaylistId) {
            this.currentSentences = await storage.getSentencesByPlaylist(this.currentPlaylistId);
        }
    }

    async getSentenceCount(playlistId) {
        const sentences = await storage.getSentencesByPlaylist(playlistId);
        return sentences.length;
    }

    async exportPlaylist(playlistId) {
        const exportData = await storage.exportPlaylist(playlistId);

        // Create download
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const playlist = await storage.getPlaylist(playlistId);
        const filename = `${playlist.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
    }

    async importPlaylist(file, autoTranslate = false) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const jsonData = event.target.result;
                    const data = JSON.parse(jsonData);

                    // Check if auto-translation is needed
                    if (autoTranslate && data.sentences) {
                        const needsTranslation = data.sentences.some(s => !s.nativeText || !s.nativeText.trim());

                        if (needsTranslation) {
                            // Translate missing translations
                            const translatedSentences = await translationService.translateBatch(
                                data.sentences,
                                data.playlist.targetLang,
                                data.playlist.nativeLang
                            );
                            data.sentences = translatedSentences;
                        }
                    }

                    const playlistId = await storage.importPlaylist(JSON.stringify(data));
                    resolve(playlistId);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }
}

// Create global instance
const playlistManager = new PlaylistManager();
