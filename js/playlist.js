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

    async duplicatePlaylist(id) {
        // Get original playlist and sentences
        const playlist = await storage.getPlaylist(id);
        const sentences = await storage.getSentencesByPlaylist(id);

        // Create new playlist with " (Copy)" suffix
        const newName = `${playlist.name} (Copy)`;
        const newId = await this.createPlaylist(
            newName,
            playlist.targetLang,
            playlist.nativeLang,
            playlist.icon,
            playlist.description
        );

        // Copy all sentences
        for (const sentence of sentences) {
            await this.addSentence(newId, {
                targetText: sentence.targetText,
                nativeText: sentence.nativeText,
                customAudio: sentence.customAudio
            });
        }

        // Copy settings
        if (playlist.settings) {
            await storage.updatePlaylist(newId, { settings: playlist.settings });
        }

        return newId;
    }

    async exportAsText(playlistId) {
        const playlist = await storage.getPlaylist(playlistId);
        const sentences = await storage.getSentencesByPlaylist(playlistId);

        // Format: Target\nNative\nTarget\nNative (no empty lines)
        const textLines = [];
        for (const sentence of sentences) {
            textLines.push(sentence.targetText);
            textLines.push(sentence.nativeText);
        }

        const text = textLines.join('\n');
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const filename = `${playlist.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.txt`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
    }

    async importFromText(file, targetLang, nativeLang) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const text = event.target.result;
                    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

                    if (lines.length === 0 || lines.length % 2 !== 0) {
                        throw new Error('Invalid text format. Each sentence pair must have target and native text.');
                    }

                    // Create playlist
                    const playlistName = file.name.replace(/\.txt$/i, '');
                    const playlistId = await this.createPlaylist(playlistName, targetLang, nativeLang);

                    // Add sentences (pairs of lines)
                    for (let i = 0; i < lines.length; i += 2) {
                        await this.addSentence(playlistId, {
                            targetText: lines[i],
                            nativeText: lines[i + 1]
                        });
                    }

                    resolve(playlistId);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(reader.error);
            reader.readAsText(file, 'UTF-8');
        });
    }

    async changePlaylistLanguage(playlistId, newTargetLang, autoTranslate = false) {
        const playlist = await storage.getPlaylist(playlistId);
        const sentences = await storage.getSentencesByPlaylist(playlistId);

        // Update playlist language
        await storage.updatePlaylist(playlistId, { targetLang: newTargetLang });

        if (autoTranslate && sentences.length > 0) {
            // Translate all sentences to new language
            // IMPORTANT: Translate from native text (source of truth) to new target language
            // This is more accurate than translating from old target language
            for (const sentence of sentences) {
                try {
                    const translatedText = await translationService.translate(
                        sentence.nativeText,  // Source: native text (more accurate)
                        playlist.nativeLang,  // From: native language
                        newTargetLang         // To: new target language
                    );

                    await this.updateSentence(sentence.id, {
                        targetText: translatedText,
                        targetLang: newTargetLang
                    });
                } catch (error) {
                    console.error(`Failed to translate sentence ${sentence.id}:`, error);
                    // Continue with other sentences even if one fails
                }
            }
        } else {
            // Just update language code without translating
            for (const sentence of sentences) {
                await this.updateSentence(sentence.id, { targetLang: newTargetLang });
            }
        }

        return true;
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
