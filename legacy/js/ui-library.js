// Auto-extracted from ui.js. Methods are mixed into UIManager.prototype.

class UIManagerLibraryMethods {
    // Playlist Actions
    async showCreatePlaylistModal() {
        document.getElementById('playlist-name-input').value = '';

        // Load global language settings as defaults
        const { targetLang } = await welcomeManager.getGlobalLanguages();
        document.getElementById('playlist-target-lang').value = targetLang;

        // Use current interface language as default native language
        const interfaceLang = i18n.getCurrentLanguage();
        document.getElementById('playlist-native-lang').value = interfaceLang;

        this.showModal('create-playlist-modal');
    }

    async createPlaylist() {
        const name = document.getElementById('playlist-name-input').value.trim();
        const targetLang = document.getElementById('playlist-target-lang').value;
        const nativeLang = document.getElementById('playlist-native-lang').value;
        const icon = document.getElementById('playlist-icon').value.trim() || '📚';
        const description = document.getElementById('playlist-description').value.trim();

        if (!name) {
            await dialog.alert('Please enter a playlist name', 'Validation Error');
            return;
        }

        try {
            const id = await playlistManager.createPlaylist(name, targetLang, nativeLang, icon, description);
            this.hideModal('create-playlist-modal');
            await this.renderPlaylists();
            this.showPlayerView(id);
        } catch (error) {
            await dialog.alert('Error creating playlist: ' + error.message, 'Error');
        }
    }


    async showEditPlaylistModal() {
        this.hideModal('playlist-menu-modal');

        const playlist = await playlistManager.getPlaylist(playlistManager.currentPlaylistId);

        // Set current values
        document.getElementById('edit-playlist-name').value = playlist.name || '';
        document.getElementById('edit-target-lang').value = playlist.targetLang || 'en-US';
        document.getElementById('edit-playlist-icon').value = playlist.icon || '📚';
        document.getElementById('edit-playlist-description').value = playlist.description || '';

        // Highlight selected icon
        document.querySelectorAll('.icon-option').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.dataset.icon === (playlist.icon || '📚')) {
                btn.classList.add('selected');
            }
        });

        // Populate merge playlist dropdown
        const mergeSelect = document.getElementById('merge-playlist-select');
        if (mergeSelect) {
            mergeSelect.innerHTML = '<option value="" data-i18n="playlist.mergeSelectOption">-- Select Playlist to Merge --</option>';
            const allPlaylists = await playlistManager.getAllPlaylists();
            allPlaylists.forEach(p => {
                if (p.id !== playlist.id && p.targetLang === playlist.targetLang) {
                    const option = document.createElement('option');
                    option.value = p.id;
                    option.textContent = p.name;
                    mergeSelect.appendChild(option);
                }
            });
            // Ensure i18n is reapplied to the newly added default option
            i18n.updateUI();
        }

        this.showModal('edit-playlist-modal');
    }

    async savePlaylistMetadata() {
        const name = document.getElementById('edit-playlist-name').value.trim();
        const icon = document.getElementById('edit-playlist-icon').value.trim() || '📚';
        const description = document.getElementById('edit-playlist-description').value.trim();
        const newTargetLang = document.getElementById('edit-target-lang').value;

        if (!name) {
            await dialog.alert('Please enter a playlist name', 'Validation Error');
            return;
        }

        try {
            // Get current playlist to check if language changed
            const playlist = await playlistManager.getPlaylist(playlistManager.currentPlaylistId);
            const languageChanged = playlist.targetLang !== newTargetLang;

            // If language changed, ask about auto-translation
            if (languageChanged) {
                const sentences = await storage.getSentencesByPlaylist(playlistManager.currentPlaylistId);

                if (sentences.length > 0) {
                    const autoTranslate = await dialog.confirm(
                        `You are changing the target language from ${playlist.targetLang} to ${newTargetLang}.\n\n` +
                        `Would you like to automatically translate all ${sentences.length} sentence(s) to the new language?\n\n` +
                        `This will use an online translation service.`
                    );

                    if (autoTranslate) {
                        this.showToast('Translating sentences... Please wait.');

                        // Use the changePlaylistLanguage method
                        await playlistManager.changePlaylistLanguage(
                            playlistManager.currentPlaylistId,
                            newTargetLang,
                            true
                        );
                    } else {
                        // Just update language without translating
                        await playlistManager.changePlaylistLanguage(
                            playlistManager.currentPlaylistId,
                            newTargetLang,
                            false
                        );
                    }
                }
            }

            // Update playlist metadata
            await playlistManager.updatePlaylist(playlistManager.currentPlaylistId, {
                name,
                icon,
                description
            });

            // Handle playlist merge
            let mergeMessage = '';
            const mergeSelect = document.getElementById('merge-playlist-select');
            const mergePlaylistId = mergeSelect ? mergeSelect.value : '';

            if (mergePlaylistId) {
                const mergePlaylist = await playlistManager.getPlaylist(parseInt(mergePlaylistId));
                if (mergePlaylist) {
                    const confirmMsg = i18n.t('playlist.mergePlaylistConfirm', { playlistName: mergePlaylist.name })
                        || `Are you sure you want to merge "${mergePlaylist.name}" into this playlist?\n\nSentences will be added (duplicates ignored) and "${mergePlaylist.name}" will be deleted. This cannot be undone.`;

                    const confirmMerge = await dialog.confirm(confirmMsg, i18n.t('playlist.mergePlaylist') || 'Merge Playlist');

                    if (confirmMerge) {
                        this.showToast(i18n.t('playlist.mergingWait') || 'Merging playlists... Please wait.');
                        const addedCount = await playlistManager.mergePlaylists(playlistManager.currentPlaylistId, parseInt(mergePlaylistId));
                        mergeMessage = i18n.t('playlist.mergePlaylistSuccess', { count: addedCount }) || `Merged successfully! Added ${addedCount} new sentence(s).`;
                    }
                }
            }

            this.hideModal('edit-playlist-modal');

            // Refresh display
            await this.renderPlaylists();
            await this.showPlayerView(playlistManager.currentPlaylistId);

            if (mergeMessage) {
                this.showToast(mergeMessage);
            } else {
                this.showToast(i18n.t('playlist.updateSuccess', { name }) || `Playlist "${name}" updated successfully!`);
            }
        } catch (error) {
            await dialog.alert('Error updating playlist: ' + error.message, 'Error');
        }
    }

    async renamePlaylist() {
        this.hideModal('playlist-menu-modal');
        const playlist = await playlistManager.getPlaylist(playlistManager.currentPlaylistId);
        const newName = await dialog.prompt('Enter new name:', 'Rename Playlist', playlist.name);

        if (newName && newName.trim()) {
            try {
                await playlistManager.renamePlaylist(playlistManager.currentPlaylistId, newName);
                document.getElementById('playlist-title').textContent = newName;
            } catch (error) {
                await dialog.alert('Error renaming playlist: ' + error.message, 'Error');
            }
        }
    }

    async deletePlaylist() {
        this.hideModal('playlist-menu-modal');

        if (await dialog.confirm('Are you sure you want to delete this playlist? This cannot be undone.', 'Confirm Delete')) {
            try {
                await playlistManager.deletePlaylist(playlistManager.currentPlaylistId);
                this.showLibraryView();
            } catch (error) {
                await dialog.alert('Error deleting playlist: ' + error.message, 'Error');
            }
        }
    }

    async exportPlaylist() {
        this.hideModal('playlist-menu-modal');

        try {
            await playlistManager.exportPlaylist(playlistManager.currentPlaylistId);
        } catch (error) {
            await dialog.alert('Error exporting playlist: ' + error.message, 'Error');
        }
    }

    importPlaylist() {
        this.hideModal('playlist-menu-modal');
        document.getElementById('import-file-input').click();
    }

    async handleImportFile(file) {
        if (!file) return;

        try {
            // Ask if user wants auto-translation
            const autoTranslate = await dialog.confirm(
                'Would you like to automatically translate any missing translations in this playlist?\n\n' +
                'This will use an online translation service for sentences without native language text.'
            );

            const playlistId = await playlistManager.importPlaylist(file, autoTranslate);

            if (autoTranslate) {
                await dialog.alert('Playlist imported and translated successfully!', 'Success');
            } else {
                await dialog.alert('Playlist imported successfully!', 'Success');
            }

            if (this.currentView === 'library-view') {
                await this.renderPlaylists();
            }
        } catch (error) {
            await dialog.alert('Error importing playlist: ' + error.message, 'Error');
        }

        // Reset file input
        document.getElementById('import-file-input').value = '';
    }

    // Full backup / restore
    async backupAllData() {
        this.hideModal('library-menu-modal');
        try {
            const data = await storage.exportAll();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `language-loop-backup_${Date.now()}.json`;
            a.click();

            URL.revokeObjectURL(url);
            this.showToast('Backup downloaded!');
        } catch (error) {
            await dialog.alert('Backup failed: ' + error.message, 'Backup Error');
        }
    }

    restoreAllData() {
        this.hideModal('library-menu-modal');
        document.getElementById('restore-all-file-input').click();
    }

    async handleRestoreAllFile(file) {
        if (!file) return;

        const confirmed = await dialog.confirm(
            'Restoring a backup will REPLACE all current playlists, sentences, groups, and settings on this device.\n\n' +
            'This cannot be undone. Continue?',
            'Restore All Data'
        );

        if (!confirmed) {
            document.getElementById('restore-all-file-input').value = '';
            return;
        }

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const result = await storage.importAll(data);

            // Re-apply restored preferences
            await app.initTheme();
            await i18n.init();

            this.showToast(`Restored ${result.playlists} playlist(s), ${result.sentences} sentence(s).`);
            await this.showLibraryView();
        } catch (error) {
            await dialog.alert('Restore failed: ' + error.message, 'Restore Error');
        } finally {
            document.getElementById('restore-all-file-input').value = '';
        }
    }

    async exportPlaylistAsText() {
        this.hideModal('playlist-menu-modal');

        try {
            await playlistManager.exportAsText(playlistManager.currentPlaylistId);
            this.showToast('Playlist exported as text!');
        } catch (error) {
            await dialog.alert('Error exporting playlist: ' + error.message, 'Error');
        }
    }

    importPlaylistFromText() {
        this.hideModal('library-menu-modal');
        this.hideModal('playlist-menu-modal');

        // Open file picker
        document.getElementById('import-text-file-input').click();
    }

    async handleImportTextFile(file) {
        if (!file) return;

        // Store file
        this.pendingTextImportFile = file;

        // Try to detect languages from file content
        try {
            const text = await file.text();
            const lines = text.trim().split('\n').filter(line => line.trim());

            // Simple language detection based on character sets
            let detectedTargetLang = 'en-US';
            let detectedNativeLang = 'zh-CN';

            if (lines.length > 0) {
                const firstLine = lines[0];

                // Check if contains Chinese characters
                if (/[\u4e00-\u9fa5]/.test(firstLine)) {
                    detectedTargetLang = 'zh-CN';
                    detectedNativeLang = 'en-US';
                }
                // Check if contains Japanese characters
                else if (/[\u3040-\u309f\u30a0-\u30ff]/.test(firstLine)) {
                    detectedTargetLang = 'ja-JP';
                    detectedNativeLang = 'en-US';
                }
                // Check if contains Korean characters
                else if (/[\uac00-\ud7af]/.test(firstLine)) {
                    detectedTargetLang = 'ko-KR';
                    detectedNativeLang = 'en-US';
                }
            }

            // Set detected values as defaults
            document.getElementById('import-target-lang').value = detectedTargetLang;
            document.getElementById('import-native-lang').value = detectedNativeLang;

        } catch (error) {
            console.error('Error detecting language:', error);
            // Use defaults if detection fails
            document.getElementById('import-target-lang').value = 'en-US';
            document.getElementById('import-native-lang').value = 'zh-CN';
        }

        // Show language selection modal
        this.showModal('import-text-lang-modal');
    }

    async processTextImport() {
        const file = this.pendingTextImportFile;
        if (!file) return;

        const targetLang = document.getElementById('import-target-lang').value;
        const nativeLang = document.getElementById('import-native-lang').value;

        try {
            const playlistId = await playlistManager.importFromText(file, targetLang, nativeLang);

            this.showToast('Playlist imported from text successfully!');

            // Reload playlist list
            if (this.currentView === 'library-view') {
                await this.renderPlaylists();
            }

            this.hideModal('import-text-lang-modal');
        } catch (error) {
            await dialog.alert('Error importing text file: ' + error.message, 'Error');
        }

        // Reset file input
        document.getElementById('import-text-file-input').value = '';
        this.pendingTextImportFile = null;
    }

    async duplicatePlaylist() {
        this.hideModal('playlist-menu-modal');

        try {
            const newId = await playlistManager.duplicatePlaylist(playlistManager.currentPlaylistId);
            this.showToast('Playlist duplicated successfully!');

            // Reload playlist list
            if (this.currentView === 'library-view') {
                await this.renderPlaylists();
            }
        } catch (error) {
            await dialog.alert('Error duplicating playlist: ' + error.message, 'Error');
        }
    }

    async showStudyStats() {
        const playlistId = playlistManager.currentPlaylistId;
        if (!playlistId) {
            await dialog.alert('Please open a playlist first', 'Notice');
            return;
        }

        const playlist = await playlistManager.getPlaylist(playlistId);
        const sentences = await storage.getSentencesByPlaylist(playlistId);

        const total = sentences.length;
        const disabled = sentences.filter((s) => s.disabled).length;
        const active = total - disabled;
        const totalSuccess = sentences.reduce((sum, s) => sum + (s.successCount || 0), 0);
        const mastered = sentences.filter((s) => (s.successCount || 0) >= 3).length;
        const avg = total > 0 ? (totalSuccess / total).toFixed(1) : '0.0';

        const card = (value, label) => `
            <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:10px; padding:0.75rem; text-align:center;">
                <div style="font-size:1.5rem; font-weight:600;">${value}</div>
                <div style="font-size:0.8rem; color:var(--text-secondary);">${label}</div>
            </div>
        `;

        const content = document.getElementById('study-stats-content');
        content.innerHTML = `
            <h3 style="margin-bottom:0.75rem;">${this.escapeHtml(playlist.name)}</h3>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                ${card(total, 'Total sentences')}
                ${card(active, 'Active')}
                ${card(mastered, 'Mastered (3+)')}
                ${card(avg, 'Avg. successes')}
            </div>
            <p style="margin-top:1rem; color:var(--text-secondary); font-size:0.85rem;">
                Mastered = answered correctly 3 or more times.
            </p>
        `;

        this.showModal('study-stats-modal');
    }

}

// Class methods are non-enumerable, so Object.assign would copy nothing.
// Copy every own property (including non-enumerable methods) explicitly.
Object.getOwnPropertyNames(UIManagerLibraryMethods.prototype).forEach((name) => {
    if (name !== 'constructor') {
        Object.defineProperty(
            UIManager.prototype,
            name,
            Object.getOwnPropertyDescriptor(UIManagerLibraryMethods.prototype, name)
        );
    }
});
