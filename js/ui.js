// UI Manager
class UIManager {
    constructor() {
        this.currentView = null;
        this.editingSentenceId = null;
        this.recordedAudio = null;
        this.isRecording = false;
    }

    init() {
        this.setupEventListeners();
        this.setupAudioEngineListeners();
    }

    setupEventListeners() {
        // Welcome screen
        document.getElementById('get-started-btn')?.addEventListener('click', () => {
            this.showLibraryView();
        });

        // Library view
        document.getElementById('add-playlist-btn')?.addEventListener('click', () => {
            this.showCreatePlaylistModal();
        });

        // Player view
        document.getElementById('back-to-library-btn')?.addEventListener('click', () => {
            audioEngine.stop();
            this.showLibraryView();
        });

        document.getElementById('play-pause-btn')?.addEventListener('click', () => {
            this.togglePlayPause();
        });

        document.getElementById('next-btn')?.addEventListener('click', () => {
            audioEngine.next();
        });

        document.getElementById('prev-btn')?.addEventListener('click', () => {
            audioEngine.previous();
        });

        document.getElementById('add-sentence-btn')?.addEventListener('click', () => {
            this.showSentenceEditor();
        });

        document.getElementById('playlist-menu-btn')?.addEventListener('click', () => {
            this.showPlaylistMenu();
        });

        // Editor modal
        document.getElementById('close-editor-btn')?.addEventListener('click', () => {
            this.hideModal('editor-modal');
        });

        document.getElementById('cancel-editor-btn')?.addEventListener('click', () => {
            this.hideModal('editor-modal');
        });

        document.getElementById('sentence-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSentence();
        });

        // Recording
        document.getElementById('record-btn')?.addEventListener('click', () => {
            this.toggleRecording();
        });

        document.getElementById('play-recording-btn')?.addEventListener('click', () => {
            this.playRecording();
        });

        document.getElementById('delete-recording-btn')?.addEventListener('click', () => {
            this.deleteRecording();
        });

        // Auto-translate
        document.getElementById('auto-translate-btn')?.addEventListener('click', () => {
            this.autoTranslate();
        });

        // Settings modal
        document.getElementById('settings-btn')?.addEventListener('click', () => {
            this.hideModal('playlist-menu-modal');
            this.showSettings();
        });

        document.getElementById('close-settings-btn')?.addEventListener('click', () => {
            this.hideModal('settings-modal');
        });

        document.getElementById('settings-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });

        // Playlist menu
        document.getElementById('rename-playlist-btn')?.addEventListener('click', () => {
            this.renamePlaylist();
        });

        document.getElementById('export-playlist-btn')?.addEventListener('click', () => {
            this.exportPlaylist();
        });

        document.getElementById('import-playlist-btn')?.addEventListener('click', () => {
            this.importPlaylist();
        });

        document.getElementById('delete-playlist-btn')?.addEventListener('click', () => {
            this.deletePlaylist();
        });

        document.getElementById('close-menu-btn')?.addEventListener('click', () => {
            this.hideModal('playlist-menu-modal');
        });

        // Import file input
        document.getElementById('import-file-input')?.addEventListener('change', (e) => {
            this.handleImportFile(e.target.files[0]);
        });

        // Playlist creation modal
        document.getElementById('close-playlist-modal-btn')?.addEventListener('click', () => {
            this.hideModal('create-playlist-modal');
        });

        document.getElementById('cancel-playlist-btn')?.addEventListener('click', () => {
            this.hideModal('create-playlist-modal');
        });

        document.getElementById('playlist-create-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createPlaylist();
        });
    }

    setupAudioEngineListeners() {
        audioEngine.on('sentenceChange', (data) => {
            this.updateCurrentSentence(data.index);
        });

        audioEngine.on('playbackStateChange', (data) => {
            this.updatePlaybackButton(data.isPlaying);
        });
    }

    // View Management
    showView(viewId) {
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
        });

        const view = document.getElementById(viewId);
        if (view) {
            view.classList.remove('hidden');
            this.currentView = viewId;
        }
    }

    async showWelcomeView() {
        this.showView('welcome-view');
    }

    async showLibraryView() {
        this.showView('library-view');
        await this.renderPlaylists();
    }

    async showPlayerView(playlistId) {
        this.showView('player-view');

        const playlist = await playlistManager.getPlaylist(playlistId);
        const sentences = await playlistManager.loadPlaylist(playlistId);

        document.getElementById('current-playlist-name').textContent = playlist.name;

        audioEngine.loadPlaylist(sentences);
        await this.renderSentences(sentences);

        if (sentences.length > 0) {
            this.updateCurrentSentence(0);
        }
    }

    // Playlist Rendering
    async renderPlaylists() {
        const playlists = await playlistManager.getAllPlaylists();
        const container = document.getElementById('playlists-container');
        const emptyState = document.getElementById('empty-library');

        if (playlists.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        container.innerHTML = '';

        for (const playlist of playlists) {
            const count = await playlistManager.getSentenceCount(playlist.id);
            const card = this.createPlaylistCard(playlist, count);
            container.appendChild(card);
        }
    }

    createPlaylistCard(playlist, sentenceCount) {
        const card = document.createElement('div');
        card.className = 'playlist-card';
        card.innerHTML = `
            <h3>${this.escapeHtml(playlist.name)}</h3>
            <div class="playlist-meta">
                ${sentenceCount} sentence${sentenceCount !== 1 ? 's' : ''}
            </div>
        `;

        card.addEventListener('click', () => {
            this.showPlayerView(playlist.id);
        });

        return card;
    }

    // Sentence Rendering
    async renderSentences(sentences) {
        const container = document.getElementById('sentences-container');
        const emptyState = document.getElementById('empty-playlist');

        document.getElementById('total-sentences').textContent = sentences.length;

        if (sentences.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        container.innerHTML = '';

        sentences.forEach((sentence, index) => {
            const item = this.createSentenceItem(sentence, index);
            container.appendChild(item);
        });
    }

    createSentenceItem(sentence, index) {
        const item = document.createElement('div');
        item.className = 'sentence-item';
        item.dataset.sentenceId = sentence.id;
        item.dataset.index = index;

        item.innerHTML = `
            <div class="sentence-target">${this.escapeHtml(sentence.targetText)}</div>
            <div class="sentence-native">${this.escapeHtml(sentence.nativeText)}</div>
            <div class="sentence-actions">
                <button class="btn edit-sentence-btn">Edit</button>
                <button class="btn danger delete-sentence-btn">Delete</button>
            </div>
        `;

        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn')) {
                audioEngine.jumpToSentence(index);
                if (!audioEngine.isPlaying) {
                    audioEngine.play();
                }
            }
        });

        item.querySelector('.edit-sentence-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.editSentence(sentence);
        });

        item.querySelector('.delete-sentence-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmDeleteSentence(sentence.id);
        });

        return item;
    }

    updateCurrentSentence(index) {
        // Update display
        const sentence = playlistManager.currentSentences[index];
        if (sentence) {
            document.getElementById('current-target-text').textContent = sentence.targetText;
            document.getElementById('current-native-text').textContent = sentence.nativeText;
            document.getElementById('current-position').textContent = index + 1;
        }

        // Update list highlighting
        document.querySelectorAll('.sentence-item').forEach(item => {
            item.classList.remove('active', 'playing');
        });

        const currentItem = document.querySelector(`.sentence-item[data-index="${index}"]`);
        if (currentItem) {
            currentItem.classList.add('active');
            if (audioEngine.isPlaying) {
                currentItem.classList.add('playing');
            }
            currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    updatePlaybackButton(isPlaying) {
        const btn = document.getElementById('play-pause-btn');
        if (isPlaying) {
            btn.textContent = '⏸';
            btn.title = 'Pause';
        } else {
            btn.textContent = '▶';
            btn.title = 'Play';
        }
    }

    togglePlayPause() {
        if (audioEngine.isPlaying) {
            audioEngine.pause();
        } else {
            audioEngine.play();
        }
    }

    // Playlist Actions
    showCreatePlaylistModal() {
        document.getElementById('playlist-name-input').value = '';
        document.getElementById('playlist-target-lang').value = 'en-US';
        document.getElementById('playlist-native-lang').value = 'zh-CN';
        this.showModal('create-playlist-modal');
    }

    async createPlaylist() {
        const name = document.getElementById('playlist-name-input').value.trim();
        const targetLang = document.getElementById('playlist-target-lang').value;
        const nativeLang = document.getElementById('playlist-native-lang').value;

        if (!name) {
            alert('Please enter a playlist name');
            return;
        }

        try {
            const id = await playlistManager.createPlaylist(name, targetLang, nativeLang);
            this.hideModal('create-playlist-modal');
            await this.renderPlaylists();
            this.showPlayerView(id);
        } catch (error) {
            alert('Error creating playlist: ' + error.message);
        }
    }

    async renamePlaylist() {
        this.hideModal('playlist-menu-modal');
        const playlist = await playlistManager.getPlaylist(playlistManager.currentPlaylistId);
        const newName = prompt('Enter new name:', playlist.name);

        if (newName && newName.trim()) {
            try {
                await playlistManager.renamePlaylist(playlistManager.currentPlaylistId, newName);
                document.getElementById('current-playlist-name').textContent = newName;
            } catch (error) {
                alert('Error renaming playlist: ' + error.message);
            }
        }
    }

    async deletePlaylist() {
        this.hideModal('playlist-menu-modal');

        if (confirm('Are you sure you want to delete this playlist? This cannot be undone.')) {
            try {
                await playlistManager.deletePlaylist(playlistManager.currentPlaylistId);
                this.showLibraryView();
            } catch (error) {
                alert('Error deleting playlist: ' + error.message);
            }
        }
    }

    async exportPlaylist() {
        this.hideModal('playlist-menu-modal');

        try {
            await playlistManager.exportPlaylist(playlistManager.currentPlaylistId);
        } catch (error) {
            alert('Error exporting playlist: ' + error.message);
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
            const autoTranslate = confirm(
                'Would you like to automatically translate any missing translations in this playlist?\n\n' +
                'This will use an online translation service for sentences without native language text.'
            );

            const playlistId = await playlistManager.importPlaylist(file, autoTranslate);

            if (autoTranslate) {
                alert('Playlist imported and translated successfully!');
            } else {
                alert('Playlist imported successfully!');
            }

            if (this.currentView === 'library-view') {
                await this.renderPlaylists();
            }
        } catch (error) {
            alert('Error importing playlist: ' + error.message);
        }

        // Reset file input
        document.getElementById('import-file-input').value = '';
    }

    // Sentence Editor
    showSentenceEditor(sentence = null) {
        this.editingSentenceId = sentence ? sentence.id : null;
        this.recordedAudio = sentence?.customAudio || null;

        document.getElementById('editor-title').textContent = sentence ? 'Edit Sentence' : 'Add Sentence';
        document.getElementById('target-text-input').value = sentence?.targetText || '';
        document.getElementById('native-text-input').value = sentence?.nativeText || '';

        this.updateRecordingUI();
        this.showModal('editor-modal');
    }

    editSentence(sentence) {
        this.showSentenceEditor(sentence);
    }

    async saveSentence() {
        const targetText = document.getElementById('target-text-input').value.trim();
        const nativeText = document.getElementById('native-text-input').value.trim();

        if (!targetText || !nativeText) {
            alert('Please fill in both sentences');
            return;
        }

        const sentenceData = {
            targetText,
            nativeText,
            customAudio: this.recordedAudio
        };

        try {
            if (this.editingSentenceId) {
                await playlistManager.updateSentence(this.editingSentenceId, sentenceData);
            } else {
                await playlistManager.addSentence(playlistManager.currentPlaylistId, sentenceData);
            }

            this.hideModal('editor-modal');

            // Reload sentences
            audioEngine.loadPlaylist(playlistManager.currentSentences);
            await this.renderSentences(playlistManager.currentSentences);
        } catch (error) {
            alert('Error saving sentence: ' + error.message);
        }
    }

    async confirmDeleteSentence(sentenceId) {
        if (confirm('Delete this sentence?')) {
            try {
                await playlistManager.deleteSentence(sentenceId);
                audioEngine.loadPlaylist(playlistManager.currentSentences);
                await this.renderSentences(playlistManager.currentSentences);
            } catch (error) {
                alert('Error deleting sentence: ' + error.message);
            }
        }
    }

    // Recording
    async toggleRecording() {
        if (this.isRecording) {
            await this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        const success = await audioEngine.startRecording();
        if (success) {
            this.isRecording = true;
            document.getElementById('record-btn').textContent = '⏹️ Stop';
            document.getElementById('recording-status').textContent = 'Recording...';
            document.getElementById('recording-status').classList.add('recording');
        }
    }

    async stopRecording() {
        const audioBlob = await audioEngine.stopRecording();
        this.isRecording = false;
        this.recordedAudio = audioBlob;

        this.updateRecordingUI();
    }

    updateRecordingUI() {
        const recordBtn = document.getElementById('record-btn');
        const playBtn = document.getElementById('play-recording-btn');
        const deleteBtn = document.getElementById('delete-recording-btn');
        const status = document.getElementById('recording-status');

        if (this.recordedAudio) {
            recordBtn.textContent = '🎙️ Re-record';
            playBtn.classList.remove('hidden');
            deleteBtn.classList.remove('hidden');
            status.textContent = 'Custom audio ready';
            status.classList.remove('recording');
        } else {
            recordBtn.textContent = '🎙️ Record';
            playBtn.classList.add('hidden');
            deleteBtn.classList.add('hidden');
            status.textContent = '';
            status.classList.remove('recording');
        }
    }

    playRecording() {
        if (this.recordedAudio) {
            const url = URL.createObjectURL(this.recordedAudio);
            const audio = new Audio(url);
            audio.play();
            audio.onended = () => URL.revokeObjectURL(url);
        }
    }

    deleteRecording() {
        this.recordedAudio = null;
        this.updateRecordingUI();
    }

    // Auto-translate
    async autoTranslate() {
        const targetText = document.getElementById('target-text-input').value.trim();

        if (!targetText) {
            alert('Please enter the target language sentence first');
            return;
        }

        const playlist = await playlistManager.getPlaylist(playlistManager.currentPlaylistId);
        if (!playlist) {
            alert('Error: Could not load playlist information');
            return;
        }

        // Show loading state
        const btn = document.getElementById('auto-translate-btn');
        const originalText = btn.textContent;
        btn.textContent = '⏳ Translating...';
        btn.disabled = true;

        try {
            const translation = await translationService.translate(
                targetText,
                playlist.targetLang,
                playlist.nativeLang
            );

            document.getElementById('native-text-input').value = translation;
        } catch (error) {
            alert('Translation failed. Please enter translation manually.');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    // Settings
    async showSettings() {
        const repeatCount = await storage.getSetting('repeatCount', 2);
        const pauseDuration = await storage.getSetting('pauseDuration', 1);

        document.getElementById('repeat-count-input').value = repeatCount;
        document.getElementById('pause-duration-input').value = pauseDuration;

        this.showModal('settings-modal');
    }

    async saveSettings() {
        const repeatCount = parseInt(document.getElementById('repeat-count-input').value);
        const pauseDuration = parseFloat(document.getElementById('pause-duration-input').value);

        await storage.setSetting('repeatCount', repeatCount);
        await storage.setSetting('pauseDuration', pauseDuration);

        audioEngine.setPlaybackSettings(repeatCount, pauseDuration);

        this.hideModal('settings-modal');
        alert('Settings saved!');
    }

    // Modal Management
    showModal(modalId) {
        document.getElementById(modalId)?.classList.remove('hidden');
    }

    hideModal(modalId) {
        document.getElementById(modalId)?.classList.add('hidden');
    }

    showPlaylistMenu() {
        this.showModal('playlist-menu-modal');
    }

    // Utilities
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create global instance
const ui = new UIManager();
