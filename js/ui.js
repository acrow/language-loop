// UI Manager
class UIManager {
    constructor() {
        this.currentView = null;
        this.editingSentenceId = null;
        this.recordedAudio = null;
        this.isRecording = false;
        this.isVoiceInput = false;
    }

    init() {
        this.populateLanguageDropdowns();
        this.setupEventListeners();
        this.setupAudioEngineListeners();
        this.setupCloudSyncListener();
    }

    setupCloudSyncListener() {
        const tryInit = () => {
            if (!window.cloudService) {
                setTimeout(tryInit, 200);
                return;
            }
            if (!this._cloudAuthListenerSet) {
                this._cloudAuthListenerSet = true;
                window.cloudService.onAuthChange((user) => {
                    this._updateCloudAuthUI(user);
                });
            }
        };
        tryInit();
    }

    populateLanguageDropdowns() {
        // Populate all language select elements
        const selects = [
            { id: 'global-target-lang', useNativeName: false },
            { id: 'global-native-lang', useNativeName: true },
            { id: 'playlist-target-lang', useNativeName: false },
            { id: 'playlist-native-lang', useNativeName: false },
            { id: 'edit-target-lang', useNativeName: false },
            { id: 'import-target-lang', useNativeName: false },
            { id: 'import-native-lang', useNativeName: false }
        ];

        selects.forEach(({ id, useNativeName }) => {
            const element = document.getElementById(id);
            if (element) {
                populateLanguageSelect(element, useNativeName);
            }
        });
    }

    setupEventListeners() {
        // Welcome screen
        document.getElementById('get-started-btn')?.addEventListener('click', () => {
            this.showLibraryView();
        });

        // Library view
        document.getElementById('add-playlist-btn')?.addEventListener('click', () => {
            this.hideModal('library-menu-modal');
            this.showCreatePlaylistModal();
        });

        document.getElementById('language-settings-btn')?.addEventListener('click', () => {
            this.showWelcomeView();
        });

        // Player view
        document.getElementById('back-to-library-btn')?.addEventListener('click', async () => {
            audioEngine.stop();
            playlistManager.currentPlaylistId = null;
            await storage.deleteSetting('lastPlaylistId');
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

        document.getElementById('player-menu-btn')?.addEventListener('click', () => {
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

        // Memo toggle
        document.getElementById('toggle-memo-btn')?.addEventListener('click', () => {
            const memoSection = document.getElementById('memo-section');
            const memoArrow = document.getElementById('toggle-memo-arrow');
            const memoLabel = document.getElementById('toggle-memo-label');
            const isHidden = memoSection.classList.toggle('hidden');
            memoArrow.textContent = isHidden ? '▼' : '▲';
            memoLabel.textContent = isHidden ? 'Add Memo (Optional)' : 'Memo (Optional)';
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

        // Sleep timer in player view
        document.getElementById('sleep-timer-player')?.addEventListener('change', (e) => {
            const minutes = parseInt(e.target.value);
            const selectEl = e.target;
            const labelEl = selectEl.previousElementSibling;

            if (minutes > 0) {
                audioEngine.setSleepTimer(minutes);
                // Hide dropdown and label, show countdown
                selectEl.classList.add('hidden');
                labelEl.classList.add('hidden');
                this.startCountdownDisplay();
            } else {
                audioEngine.clearSleepTimer();
                this.stopCountdownDisplay();
            }
        });

        // Voice input
        document.getElementById('voice-input-btn')?.addEventListener('click', () => {
            this.toggleVoiceInput();
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

        // Test buttons
        document.getElementById('writing-test-btn')?.addEventListener('click', () => {
            this.hideModal('playlist-menu-modal');
            this.startTest('writing');
        });

        document.getElementById('speaking-test-btn')?.addEventListener('click', () => {
            this.hideModal('playlist-menu-modal');
            this.startTest('speaking');
        });

        // Playlist menu
        document.getElementById('edit-playlist-btn')?.addEventListener('click', () => {
            this.showEditPlaylistModal();
        });

        document.getElementById('rename-playlist-btn')?.addEventListener('click', () => {
            this.renamePlaylist();
        });

        document.getElementById('export-playlist-btn')?.addEventListener('click', () => {
            this.exportPlaylist();
        });

        document.getElementById('export-text-btn')?.addEventListener('click', () => {
            this.exportPlaylistAsText();
        });

        document.getElementById('import-playlist-btn')?.addEventListener('click', () => {
            this.importPlaylist();
        });

        document.getElementById('import-text-btn')?.addEventListener('click', () => {
            this.importPlaylistFromText();
        });

        document.getElementById('duplicate-playlist-btn')?.addEventListener('click', () => {
            this.duplicatePlaylist();
        });

        document.getElementById('delete-playlist-btn')?.addEventListener('click', () => {
            this.deletePlaylist();
        });

        document.getElementById('close-menu-btn')?.addEventListener('click', () => {
            this.hideModal('playlist-menu-modal');
        });

        document.getElementById('close-library-menu-btn')?.addEventListener('click', () => {
            this.hideModal('library-menu-modal');
        });

        // Library menu button
        document.getElementById('library-menu-btn')?.addEventListener('click', () => {
            this.showModal('library-menu-modal');
        });

        // Import file input
        document.getElementById('import-file-input')?.addEventListener('change', (e) => {
            this.handleImportFile(e.target.files[0]);
        });

        // Import text file input
        document.getElementById('import-text-file-input')?.addEventListener('change', (e) => {
            this.handleImportTextFile(e.target.files[0]);
        });

        // Import text language selection modal
        document.getElementById('close-import-text-lang-btn')?.addEventListener('click', () => {
            this.hideModal('import-text-lang-modal');
            this.pendingTextImportFile = null;
            document.getElementById('import-text-file-input').value = '';
        });

        document.getElementById('cancel-import-text-lang-btn')?.addEventListener('click', () => {
            this.hideModal('import-text-lang-modal');
            this.pendingTextImportFile = null;
            document.getElementById('import-text-file-input').value = '';
        });

        document.getElementById('import-text-lang-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.processTextImport();
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

        // Edit playlist modal
        document.getElementById('close-edit-playlist-btn')?.addEventListener('click', () => {
            this.hideModal('edit-playlist-modal');
        });

        document.getElementById('cancel-edit-playlist-btn')?.addEventListener('click', () => {
            this.hideModal('edit-playlist-modal');
        });

        document.getElementById('edit-playlist-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePlaylistMetadata();
        });

        // Icon picker for edit form
        document.querySelectorAll('.icon-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.icon-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                document.getElementById('edit-playlist-icon').value = btn.dataset.icon;
            });
        });

        // Icon picker for create form
        document.querySelectorAll('.icon-option-create').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.icon-option-create').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                document.getElementById('playlist-icon').value = btn.dataset.icon;
            });
        });

        // Test view
        document.getElementById('back-from-test-btn')?.addEventListener('click', () => {
            this.showPlayerView(playlistManager.currentPlaylistId);
        });

        document.getElementById('play-test-sentence-btn')?.addEventListener('click', () => {
            this.playTestSentence();
        });

        document.getElementById('submit-answer-btn')?.addEventListener('click', () => {
            this.submitAnswer();
        });

        document.getElementById('speak-answer-btn')?.addEventListener('click', () => {
            this.toggleSpeakAnswer();
        });

        document.getElementById('next-test-btn')?.addEventListener('click', () => {
            this.nextTestQuestion();
        });

        // Test navigation buttons
        document.getElementById('prev-test-sentence-btn')?.addEventListener('click', () => {
            this.previousTestSentence();
        });

        document.getElementById('next-test-sentence-btn')?.addEventListener('click', () => {
            this.nextTestSentence();
        });

        document.getElementById('retry-test-btn')?.addEventListener('click', () => {
            this.retryTest();
        });

        document.getElementById('back-to-player-btn')?.addEventListener('click', () => {
            this.showPlayerView(playlistManager.currentPlaylistId);
        });

        // Test answer input - submit on Enter
        document.getElementById('test-answer-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.submitAnswer();
            }
        });

        // Global Enter key handler for test view
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.currentView === 'test') {
                const feedbackEl = document.getElementById('test-feedback');
                const nextBtn = document.getElementById('next-test-btn');
                const answerInput = document.getElementById('test-answer-input');

                // If feedback is visible and input is not focused, trigger the next/try again button
                if (feedbackEl && !feedbackEl.classList.contains('hidden') && document.activeElement !== answerInput) {
                    e.preventDefault();
                    nextBtn.click();
                }
            }
        });

        // Theme selector buttons
        const themeButtons = ['theme-btn-welcome', 'theme-btn-library', 'theme-btn-player', 'theme-btn-test'];
        themeButtons.forEach(btnId => {
            document.getElementById(btnId)?.addEventListener('click', () => {
                this.showThemeSelector();
            });
        });

        // Theme selector modal
        document.getElementById('close-theme-selector-btn')?.addEventListener('click', () => {
            this.hideModal('theme-selector-modal');
        });

        // Theme option clicks
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.getAttribute('data-theme');
                this.applyTheme(theme);
            });
        });

        // Cloud Sync
        document.getElementById('cloud-sync-btn')?.addEventListener('click', () => {
            this.showCloudSyncModal();
        });

        document.getElementById('close-cloud-sync-btn')?.addEventListener('click', () => {
            this.hideModal('cloud-sync-modal');
        });

        document.getElementById('cloud-signin-btn')?.addEventListener('click', () => {
            this.cloudSignIn();
        });

        document.getElementById('cloud-signout-btn')?.addEventListener('click', () => {
            this.cloudSignOut();
        });

        document.getElementById('cloud-refresh-btn')?.addEventListener('click', () => {
            this.refreshCloudList();
        });

        // Cloud Sync Tabs
        document.querySelectorAll('.cloud-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Remove active class from all tabs
                document.querySelectorAll('.cloud-tab').forEach(t => t.classList.remove('active'));
                // Hide all panels
                document.querySelectorAll('.cloud-panel').forEach(p => {
                    p.classList.remove('active');
                    p.classList.add('hidden');
                });
                
                // Add active class to clicked tab
                const targetTab = e.currentTarget;
                targetTab.classList.add('active');
                
                // Show target panel
                const targetPanelId = targetTab.getAttribute('data-target');
                const targetPanel = document.getElementById(targetPanelId);
                if (targetPanel) {
                    targetPanel.classList.remove('hidden');
                    targetPanel.classList.add('active');
                }
            });
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
        // Clear current playlist when showing library
        playlistManager.currentPlaylistId = null;
        this.showView('library-view');
        await this.renderPlaylists();
    }

    async showPlayerView(playlistId) {
        this.showView('player-view');

        const playlist = await playlistManager.getPlaylist(playlistId);
        const sentences = await playlistManager.loadPlaylist(playlistId);

        document.getElementById('playlist-title').textContent = playlist.name;

        audioEngine.loadPlaylist(sentences);
        await this.renderSentences(sentences);

        if (sentences.length > 0) {
            this.updateCurrentSentence(0);
        } else {
            // Clear the current sentence display when playlist is empty
            document.getElementById('current-target-text').textContent = 'Select a sentence to play';
            document.getElementById('current-native-text').textContent = '';
            document.getElementById('current-position').textContent = '0';
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

        // Apply saved order; unknown/new playlists go to the front by createdAt
        const savedOrder = await storage.getPlaylistOrder();
        if (savedOrder && savedOrder.length > 0) {
            const orderMap = new Map(savedOrder.map((id, idx) => [id, idx]));
            playlists.sort((a, b) => {
                const ia = orderMap.has(a.id) ? orderMap.get(a.id) : -a.createdAt;
                const ib = orderMap.has(b.id) ? orderMap.get(b.id) : -b.createdAt;
                return ia - ib;
            });
        } else {
            // Default: newest first
            playlists.sort((a, b) => b.createdAt - a.createdAt);
        }

        for (const playlist of playlists) {
            const count = await playlistManager.getSentenceCount(playlist.id);
            const card = this.createPlaylistCard(playlist, count);
            container.appendChild(card);
        }

        // Attach drag-and-drop to the container
        this._setupPlaylistDragDrop(container);
    }

    _setupPlaylistDragDrop(container) {
        let dragSrc = null;

        container.querySelectorAll('.playlist-card').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                dragSrc = card;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', card.dataset.playlistId);
                // Defer class to allow browser to capture drag image
                setTimeout(() => card.classList.add('dragging'), 0);
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                container.querySelectorAll('.playlist-card').forEach(c => c.classList.remove('drag-over'));
                dragSrc = null;
            });

            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (card !== dragSrc) {
                    container.querySelectorAll('.playlist-card').forEach(c => c.classList.remove('drag-over'));
                    card.classList.add('drag-over');
                }
            });

            card.addEventListener('dragleave', () => {
                card.classList.remove('drag-over');
            });

            card.addEventListener('drop', async (e) => {
                e.preventDefault();
                card.classList.remove('drag-over');
                if (!dragSrc || dragSrc === card) return;

                // Reorder DOM
                const cards = [...container.querySelectorAll('.playlist-card')];
                const srcIdx = cards.indexOf(dragSrc);
                const dstIdx = cards.indexOf(card);

                if (srcIdx < dstIdx) {
                    container.insertBefore(dragSrc, card.nextSibling);
                } else {
                    container.insertBefore(dragSrc, card);
                }

                // Persist the new order
                const newOrder = [...container.querySelectorAll('.playlist-card')]
                    .map(c => parseInt(c.dataset.playlistId));
                await storage.savePlaylistOrder(newOrder);
            });
        });
    }

    createPlaylistCard(playlist, sentenceCount) {
        const card = document.createElement('div');
        card.className = 'playlist-card';
        card.draggable = true;
        card.dataset.playlistId = playlist.id;

        // Get language display names
        const langNames = {
            'en-US': 'English',
            'zh-CN': 'Chinese',
            'ja-JP': 'Japanese',
            'es-ES': 'Spanish',
            'fr-FR': 'French',
            'de-DE': 'German',
            'ko-KR': 'Korean',
            'it-IT': 'Italian'
        };

        const targetLangName = langNames[playlist.targetLang] || playlist.targetLang;
        const nativeLangName = langNames[playlist.nativeLang] || playlist.nativeLang;
        const icon = playlist.icon || '📚';
        const description = playlist.description || '';

        card.innerHTML = `
            <div class="playlist-drag-handle" title="Drag to reorder">⋮⋮</div>
            <div class="playlist-icon">${this.escapeHtml(icon)}</div>
            <div class="playlist-info">
                <h3>${this.escapeHtml(playlist.name)}</h3>
                ${description ? `<p class="playlist-description">${this.escapeHtml(description)}</p>` : ''}
                <div class="playlist-meta">
                    <span class="language-badge">${nativeLangName} → ${targetLangName}</span>
                    <span class="sentence-count">${sentenceCount} sentence${sentenceCount !== 1 ? 's' : ''}</span>
                </div>
            </div>
        `;

        // Click on card body (not drag handle) opens player
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('playlist-drag-handle')) {
                this.showPlayerView(playlist.id);
            }
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
        item.draggable = true;

        item.innerHTML = `
            <div class="drag-handle">⋮⋮</div>
            <div class="sentence-content">
                <div class="sentence-target">${this.escapeHtml(sentence.targetText)}</div>
                <div class="sentence-native">${this.escapeHtml(sentence.nativeText)}</div>
                ${sentence.memo ? `<div class="sentence-memo">📝 ${this.escapeHtml(sentence.memo)}</div>` : ''}
            </div>
            <div class="sentence-actions">
                <button class="btn edit-sentence-btn">Edit</button>
                <button class="btn danger delete-sentence-btn">Delete</button>
            </div>
        `;

        // Drag and drop events
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', item.innerHTML);
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingItem = document.querySelector('.dragging');
            if (draggingItem && draggingItem !== item) {
                const container = item.parentElement;
                const afterElement = this.getDragAfterElement(container, e.clientY);
                if (afterElement == null) {
                    container.appendChild(draggingItem);
                } else {
                    container.insertBefore(draggingItem, afterElement);
                }
            }
        });

        item.addEventListener('drop', async (e) => {
            e.preventDefault();
            await this.saveNewOrder();
        });

        // Click to play
        item.querySelector('.sentence-content').addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn')) {
                audioEngine.jumpToSentence(index);
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
            // Removed scrollIntoView to prevent auto-scrolling
        }
    }

    updatePlaybackButton(isPlaying) {
        const btn = document.getElementById('play-pause-btn');
        const timerControls = document.querySelector('.sleep-timer-controls');

        if (isPlaying) {
            btn.textContent = '⏸';
            btn.title = 'Pause';
            // Show timer controls when playing
            timerControls.classList.remove('hidden');
        } else {
            btn.textContent = '▶';
            btn.title = 'Play';
            // Hide timer controls and clear timer when stopped
            timerControls.classList.add('hidden');
            this.stopCountdownDisplay();
            audioEngine.clearSleepTimer();
        }
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.sentence-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    async saveNewOrder() {
        const items = document.querySelectorAll('.sentence-item');
        const newOrder = Array.from(items).map(item => parseInt(item.dataset.sentenceId));

        // Update order in playlistManager.currentSentences
        const reorderedSentences = newOrder.map(id =>
            playlistManager.currentSentences.find(s => s.id === id)
        ).filter(Boolean);

        playlistManager.currentSentences = reorderedSentences;
        audioEngine.loadPlaylist(reorderedSentences);

        // Re-render to update indices
        await this.renderSentences(reorderedSentences);
    }

    togglePlayPause() {
        if (audioEngine.isPlaying) {
            audioEngine.pause();
        } else {
            audioEngine.play();
        }
    }

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

    // Sentence Editor
    showSentenceEditor(sentence = null) {
        this.editingSentenceId = sentence ? sentence.id : null;
        this.recordedAudio = sentence?.customAudio || null;

        document.getElementById('editor-title').textContent = sentence ? i18n.t('sentence.editSentence') : i18n.t('sentence.addSentence');
        document.getElementById('target-text-input').value = sentence?.targetText || '';
        document.getElementById('native-text-input').value = sentence?.nativeText || '';
        document.getElementById('memo-input').value = sentence?.memo || '';

        // Set up memo toggle button
        const memoSection = document.getElementById('memo-section');
        const memoArrow = document.getElementById('toggle-memo-arrow');
        const memoLabel = document.getElementById('toggle-memo-label');
        const hasMemo = sentence?.memo && sentence.memo.trim();
        if (hasMemo) {
            // If editing a sentence that already has a memo, show it expanded
            memoSection.classList.remove('hidden');
            memoArrow.textContent = '▲';
            memoLabel.textContent = 'Memo (Optional)';
        } else {
            // Default: collapsed
            memoSection.classList.add('hidden');
            memoArrow.textContent = '▼';
            memoLabel.textContent = 'Add Memo (Optional)';
        }

        this.updateRecordingUI();
        this.showModal('editor-modal');
    }

    editSentence(sentence) {
        this.showSentenceEditor(sentence);
    }

    async saveSentence() {
        const targetText = document.getElementById('target-text-input').value.trim();
        const nativeText = document.getElementById('native-text-input').value.trim();
        const addAnother = document.getElementById('add-another-checkbox').checked;

        if (!targetText || !nativeText) {
            await dialog.alert('Please fill in both sentences', 'Validation Error');
            return;
        }

        const sentenceData = {
            targetText,
            nativeText,
            memo: document.getElementById('memo-input').value.trim(),
            customAudio: this.recordedAudio
        };

        try {
            if (this.editingSentenceId) {
                await playlistManager.updateSentence(this.editingSentenceId, sentenceData);
            } else {
                await playlistManager.addSentence(playlistManager.currentPlaylistId, sentenceData);
            }

            // Reload sentences
            audioEngine.loadPlaylist(playlistManager.currentSentences);
            await this.renderSentences(playlistManager.currentSentences);

            // If 'Add Another' is checked and we're adding (not editing), clear form and keep open
            if (addAnother && !this.editingSentenceId) {
                document.getElementById('target-text-input').value = '';
                document.getElementById('native-text-input').value = '';
                // Clear and collapse memo section
                document.getElementById('memo-input').value = '';
                document.getElementById('memo-section').classList.add('hidden');
                document.getElementById('toggle-memo-arrow').textContent = '▼';
                document.getElementById('toggle-memo-label').textContent = 'Add Memo (Optional)';
                this.recordedAudio = null;
                this.updateRecordingUI();
                document.getElementById('target-text-input').focus();
            } else {
                this.hideModal('editor-modal');
            }
        } catch (error) {
            await dialog.alert('Error saving sentence: ' + error.message, 'Error');
        }
    }

    async confirmDeleteSentence(sentenceId) {
        if (await dialog.confirm('Delete this sentence?', 'Confirm Delete')) {
            try {
                await playlistManager.deleteSentence(sentenceId);
                audioEngine.loadPlaylist(playlistManager.currentSentences);
                await this.renderSentences(playlistManager.currentSentences);

                // Update player header display
                if (playlistManager.currentSentences.length > 0) {
                    const currentIndex = Math.min(audioEngine.currentIndex, playlistManager.currentSentences.length - 1);
                    this.updateCurrentSentence(currentIndex);
                } else {
                    // Clear display if no sentences left
                    document.getElementById('current-target-text').textContent = 'No sentences';
                    document.getElementById('current-native-text').textContent = '';
                    document.getElementById('current-position').textContent = '0';
                }
            } catch (error) {
                await dialog.alert('Error deleting sentence: ' + error.message, 'Error');
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
            document.getElementById('record-btn').textContent = '⏹️' + i18n.t('common.stop');
            document.getElementById('recording-status').textContent = i18n.t('sentence.recording');
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
            recordBtn.textContent = '🎙️ ' + i18n.t('sentence.reRecordBtn');
            playBtn.classList.remove('hidden');
            deleteBtn.classList.remove('hidden');
            status.textContent = 'Custom audio ready';
            status.classList.remove('recording');
        } else {
            recordBtn.textContent = '🎙️ ' + i18n.t('sentence.recordBtn');
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
            await dialog.alert('Please enter the target language sentence first', 'Validation Error');
            return;
        }

        const playlist = await playlistManager.getPlaylist(playlistManager.currentPlaylistId);
        if (!playlist) {
            await dialog.alert('Error: Could not load playlist information', 'Error');
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
            await dialog.alert('Translation failed. Please enter translation manually.', 'Translation Error');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    // Voice Input
    async toggleVoiceInput() {
        if (this.isVoiceInput) {
            // Stop voice input
            audioEngine.stopSpeechRecognition();
            this.isVoiceInput = false;
            this.updateVoiceInputUI();
            return;
        }

        const playlist = await playlistManager.getPlaylist(playlistManager.currentPlaylistId);
        if (!playlist) {
            await dialog.alert('Error: Could not load playlist information', 'Error');
            return;
        }

        // Show loading state
        const btn = document.getElementById('voice-input-btn');
        const status = document.getElementById('voice-input-status');
        btn.textContent = '⏹️ Stop';
        btn.disabled = false;
        status.textContent = 'Listening...';
        status.classList.add('recording');
        this.isVoiceInput = true;

        // Start speech recognition with recording
        const success = await audioEngine.startSpeechRecognition(
            playlist.targetLang,
            (transcript, isFinal) => {
                // Update text field with transcript
                document.getElementById('target-text-input').value = transcript;
                if (isFinal) {
                    status.textContent = 'Processing...';
                }
            },
            (audioBlob) => {
                // Save the recorded audio
                this.recordedAudio = audioBlob;
                this.isVoiceInput = false;
                this.updateVoiceInputUI();
                this.updateRecordingUI();

                // Auto-translate if text was captured
                const targetText = document.getElementById('target-text-input').value.trim();
                if (targetText) {
                    this.autoTranslate();
                }
            }
        );

        if (!success) {
            this.isVoiceInput = false;
            this.updateVoiceInputUI();
        }
    }

    updateVoiceInputUI() {
        const btn = document.getElementById('voice-input-btn');
        const status = document.getElementById('voice-input-status');

        if (this.isVoiceInput) {
            btn.textContent = '⏹️ Stop';
            status.textContent = 'Listening...';
            status.classList.add('recording');
        } else {
            btn.textContent = '🎤 Voice Input';
            status.textContent = '';
            status.classList.remove('recording');
        }
    }

    // Settings
    async showSettings() {
        // Get current playlist settings
        const playlist = await playlistManager.getPlaylist(playlistManager.currentPlaylistId);
        if (!playlist) {
            await dialog.alert('Please open a playlist first', 'Notice');
            return;
        }

        const settings = playlist.settings || {
            repeatCount: 2,
            pauseDuration: 1,
            speechRate: 1.0,
            preferredVoice: '',
            speakNative: false
        };

        document.getElementById('repeat-count-input').value = settings.repeatCount;
        document.getElementById('pause-duration-input').value = settings.pauseDuration;
        document.getElementById('speech-rate-input').value = settings.speechRate;
        document.getElementById('speech-rate-value').textContent = settings.speechRate.toFixed(1);
        document.getElementById('speak-native-checkbox').checked = settings.speakNative;

        // Populate voice selector
        this.populateVoiceSelector(settings.preferredVoice);

        // Add event listener for real-time value display
        const rateInput = document.getElementById('speech-rate-input');
        rateInput.oninput = (e) => {
            document.getElementById('speech-rate-value').textContent = parseFloat(e.target.value).toFixed(1);
        };

        this.showModal('settings-modal');
    }

    populateVoiceSelector(selectedVoice) {
        const select = document.getElementById('voice-select');
        select.innerHTML = '<option value="">Auto (System Default)</option>';

        const voices = audioEngine.voices;
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})`;
            if (voice.name === selectedVoice) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    async saveSettings() {
        const repeatCount = parseInt(document.getElementById('repeat-count-input').value);
        const pauseDuration = parseFloat(document.getElementById('pause-duration-input').value);
        const speechRate = parseFloat(document.getElementById('speech-rate-input').value);
        const preferredVoice = document.getElementById('voice-select').value;
        const speakNative = document.getElementById('speak-native-checkbox').checked;

        // Save playlist-specific settings
        const playlist = await playlistManager.getPlaylist(playlistManager.currentPlaylistId);
        if (playlist) {
            await storage.updatePlaylist(playlistManager.currentPlaylistId, {
                settings: {
                    repeatCount,
                    pauseDuration,
                    speechRate,
                    preferredVoice,
                    speakNative
                }
            });

            // Apply settings to audio engine immediately
            audioEngine.setPlaybackSettings(repeatCount, pauseDuration);
            audioEngine.speechRate = speechRate;
            audioEngine.preferredVoiceName = preferredVoice;
            audioEngine.speakNativeLanguage = speakNative;
        }

        this.hideModal('settings-modal');
        this.showToast('Settings saved for this playlist!');
    }

    startCountdownDisplay() {
        const countdownEl = document.getElementById('sleep-timer-countdown');
        countdownEl.classList.remove('hidden');

        // Clear any existing interval
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        // Update countdown every second
        this.countdownInterval = setInterval(() => {
            const remaining = audioEngine.getSleepTimerRemaining();
            if (remaining > 0) {
                const minutes = Math.floor(remaining);
                const seconds = Math.round((remaining - minutes) * 60);
                countdownEl.textContent = `⏰ ${minutes}:${seconds.toString().padStart(2, '0')}`;
            } else {
                this.stopCountdownDisplay();
            }
        }, 1000);

        // Initial update
        const remaining = audioEngine.getSleepTimerRemaining();
        const minutes = Math.floor(remaining);
        const seconds = Math.round((remaining - minutes) * 60);
        countdownEl.textContent = `⏰ ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    stopCountdownDisplay() {
        const countdownEl = document.getElementById('sleep-timer-countdown');
        const selectEl = document.getElementById('sleep-timer-player');
        const labelEl = selectEl?.previousElementSibling;

        countdownEl.classList.add('hidden');
        countdownEl.textContent = '';

        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        // Reset select to "Off" and show dropdown/label again
        if (selectEl) {
            selectEl.value = '0';
            selectEl.classList.remove('hidden');
        }
        if (labelEl) {
            labelEl.classList.remove('hidden');
        }
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

    // Test Functionality
    async playTestSentence() {
        const sentence = testManager.getCurrentSentence();
        if (!sentence) return;

        const playlist = await playlistManager.getPlaylist(testManager.currentPlaylistId);
        const lang = sentence.targetLang || (playlist && playlist.targetLang) || 'en-US';

        const btn = document.getElementById('play-test-sentence-btn');
        if (btn) btn.disabled = true;

        try {
            if (sentence.customAudio) {
                await audioEngine.playCustomAudio(sentence.customAudio);
            } else {
                await audioEngine.playTTS(sentence.targetText, lang);
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async startTest(mode) {
        const success = await testManager.startTest(playlistManager.currentPlaylistId, mode);
        if (!success) return;

        this.showTestView(mode);
        this.displayTestQuestion();
    }

    showTestView(mode) {
        // Hide all views
        document.getElementById('welcome-view').classList.add('hidden');
        document.getElementById('library-view').classList.add('hidden');
        document.getElementById('player-view').classList.add('hidden');
        document.getElementById('test-view').classList.remove('hidden');
        this.currentView = 'test';

        // Update title
        document.getElementById('test-mode-title').textContent =
            mode === 'writing' ? 'Writing Test' : 'Speaking Test';

        // Show appropriate input area
        if (mode === 'writing') {
            document.getElementById('writing-test-input').classList.remove('hidden');
            document.getElementById('speaking-test-input').classList.add('hidden');
        } else {
            document.getElementById('writing-test-input').classList.add('hidden');
            document.getElementById('speaking-test-input').classList.remove('hidden');
        }

        // Hide feedback and complete screens
        document.getElementById('test-feedback').classList.add('hidden');
        document.getElementById('test-complete').classList.add('hidden');
        document.getElementById('test-input-area').classList.remove('hidden');
    }

    displayTestQuestion() {
        const sentence = testManager.getCurrentSentence();
        const progress = testManager.getProgress();

        // Update progress
        document.getElementById('test-current').textContent = progress.current;
        document.getElementById('test-total').textContent = progress.total;
        document.getElementById('test-correct').textContent = progress.correct;
        document.getElementById('test-attempted').textContent = progress.attempted;

        // Display native language as prompt
        document.getElementById('test-prompt-text').textContent = sentence.nativeText;

        // Clear input
        document.getElementById('test-answer-input').value = '';
        document.getElementById('recognized-text').classList.add('hidden');
        document.getElementById('recognized-text').textContent = '';
    }

    async submitAnswer() {
        const userAnswer = document.getElementById('test-answer-input').value.trim();

        if (!userAnswer) {
            await dialog.alert('Please enter your answer', 'Validation Error');
            return;
        }

        const result = await testManager.checkAnswer(userAnswer);
        this.showFeedback(result);
    }

    async toggleSpeakAnswer() {
        const btn = document.getElementById('speak-answer-btn');
        const status = document.getElementById('speaking-status');

        if (testManager.isListening) {
            // Stop listening
            testManager.stopSpeechRecognition();
            testManager.isListening = false;
            btn.textContent = '🎤 ' + i18n.t('test.speakAnswer');
            status.textContent = '';
            status.classList.remove('recording');
            return;
        }

        // Start listening
        testManager.isListening = true;
        btn.textContent = '⏹️ Stop';
        status.textContent = 'Listening...';
        status.classList.add('recording');

        // Clear previous recognized text
        const recognizedTextEl = document.getElementById('recognized-text');
        recognizedTextEl.textContent = '';
        recognizedTextEl.classList.add('hidden');

        try {
            const transcript = await testManager.startSpeechRecognition();
            testManager.isListening = false;
            btn.textContent = '🎤 ' + i18n.t('test.speakAnswer');
            status.textContent = '';
            status.classList.remove('recording');

            if (transcript) {
                const result = await testManager.checkAnswer(transcript);
                this.showFeedback(result);
            }
        } catch (error) {
            console.error('Speech recognition error:', error);
            testManager.isListening = false;
            btn.textContent = '🎤 ' + i18n.t('test.speakAnswer');
            status.textContent = '';
            status.classList.remove('recording');
        }
    }

    showFeedback(result) {
        // Hide input area
        document.getElementById('test-input-area').classList.add('hidden');

        // Show feedback
        const feedbackEl = document.getElementById('test-feedback');
        feedbackEl.classList.remove('hidden');

        const messageEl = document.getElementById('feedback-message');
        const comparisonEl = document.getElementById('feedback-comparison');
        const nextBtn = document.getElementById('next-test-btn');

        if (result.isCorrect) {
            messageEl.textContent = '✅ ' + i18n.t('test.correct');
            messageEl.className = 'feedback-message correct';
            comparisonEl.innerHTML = `<div style="color: var(--success); font-size: 1.25rem;">${this.escapeHtml(result.userAnswer)}</div>`;
            nextBtn.textContent = i18n.t('test.nextSentence');
            nextBtn.dataset.action = 'next'; // Mark as next action
            nextBtn.style.display = 'inline-block';
        } else {
            messageEl.textContent = `❌ ${i18n.t('test.notQuite')} (${result.similarity}% match)`;
            messageEl.className = 'feedback-message incorrect';

            // Get character-by-character diff
            const diff = testManager.getDiffHTML(result.userAnswer, result.correctAnswer);

            comparisonEl.innerHTML = `
                <div class="diff-container">
                    <div class="diff-label">${i18n.t('test.yourAnswer')}:</div>
                    <div class="diff-text">${diff.userHTML}</div>
                </div>
                <div class="diff-container">
                    <div class="diff-label">${i18n.t('test.correctAnswer')}:</div>
                    <div class="diff-text">${diff.correctHTML}</div>
                </div>
            `;
            nextBtn.textContent = i18n.t('test.tryAgain');
            nextBtn.dataset.action = 'retry'; // Mark as retry action
            nextBtn.style.display = 'inline-block';
        }
    }

    nextTestQuestion() {
        const nextBtn = document.getElementById('next-test-btn');

        // Clear recognized text before showing input again
        const recognizedTextEl = document.getElementById('recognized-text');
        recognizedTextEl.textContent = '';
        recognizedTextEl.classList.add('hidden');

        // Only advance if the button action is "next" (meaning answer was correct)
        if (nextBtn.dataset.action === 'retry') {
            // Hide feedback, show input again for retry
            document.getElementById('test-feedback').classList.add('hidden');
            document.getElementById('test-input-area').classList.remove('hidden');

            // Auto-focus the input box for writing test
            if (testManager.testMode === 'writing') {
                document.getElementById('test-answer-input').focus();
            }
            return;
        }

        // Answer was correct, move to next sentence
        testManager.nextSentence();

        if (testManager.isComplete()) {
            this.showTestComplete();
        } else {
            // Hide feedback, show input
            document.getElementById('test-feedback').classList.add('hidden');
            document.getElementById('test-input-area').classList.remove('hidden');
            this.displayTestQuestion();

            // Auto-focus the input box for writing test
            if (testManager.testMode === 'writing') {
                document.getElementById('test-answer-input').focus();
            }
        }
    }

    showTestComplete() {
        const progress = testManager.getProgress();

        // Hide input and feedback
        document.getElementById('test-input-area').classList.add('hidden');
        document.getElementById('test-feedback').classList.add('hidden');

        // Show complete screen
        const completeEl = document.getElementById('test-complete');
        completeEl.classList.remove('hidden');

        document.getElementById('final-score').textContent = progress.correct;
        document.getElementById('final-total').textContent = progress.total;
        document.getElementById('final-percentage').textContent = progress.percentage;
    }

    retryTest() {
        this.startTest(testManager.testMode);
    }

    // Navigate to previous sentence in test
    previousTestSentence() {
        testManager.previousSentence();
        this.resetTestQuestion();
    }

    // Navigate to next sentence in test
    nextTestSentence() {
        testManager.nextSentence();
        if (testManager.isComplete()) {
            // Don't go past the end, go back to last sentence
            testManager.previousSentence();
        } else {
            this.resetTestQuestion();
        }
    }

    // Reset the current question (clear input, hide feedback)
    resetTestQuestion() {
        // Clear input
        const answerInput = document.getElementById('test-answer-input');
        if (answerInput) answerInput.value = '';

        // Clear recognized text
        const recognizedTextEl = document.getElementById('recognized-text');
        if (recognizedTextEl) {
            recognizedTextEl.textContent = '';
            recognizedTextEl.classList.add('hidden');
        }

        // Hide feedback, show input
        document.getElementById('test-feedback').classList.add('hidden');
        document.getElementById('test-input-area').classList.remove('hidden');

        // Update the display
        this.displayTestQuestion();

        // Auto-focus for writing test
        if (testManager.testMode === 'writing') {
            answerInput?.focus();
        }
    }

    // Toast Notifications
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠'
        };

        toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.success}</span><span class="toast-message">${message}</span>`;

        container.appendChild(toast);

        // Auto dismiss after 3 seconds
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Theme Management
    showThemeSelector() {
        this.showModal('theme-selector-modal');
        this.updateThemeSelector();
    }

    updateThemeSelector() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        document.querySelectorAll('.theme-option').forEach(option => {
            if (option.getAttribute('data-theme') === currentTheme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }

    async applyTheme(theme) {
        // Apply theme to DOM
        document.documentElement.setAttribute('data-theme', theme);

        // Save to storage
        await storage.setSetting('theme', theme);

        // Update theme selector UI
        this.updateThemeSelector();

        // Close modal
        this.hideModal('theme-selector-modal');

        // Show toast
        const themeNames = {
            'dark': '🟣 Dark Purple',
            'light': '☀️ Light',
            'ocean': '🌊 Ocean',
            'forest': '🌲 Forest',
            'sunset': '🌅 Sunset',
            'midnight': '🌑 Midnight'
        };
        this.showToast(`Theme changed to ${themeNames[theme] || theme}`);
    }
}

// Create global instance
const ui = new UIManager();

// ─── Cloud Sync Methods (added separately to avoid large class edits) ───────

UIManager.prototype.showCloudSyncModal = function () {
    this.showModal('cloud-sync-modal');
    if (window.cloudService && window.cloudService.getCurrentUser()) {
        this.refreshCloudList();
        this._renderLocalForUpload();
    }
};

UIManager.prototype._updateCloudAuthUI = function (user) {
    const signedOutEl = document.getElementById('cloud-signed-out');
    const signedInEl = document.getElementById('cloud-signed-in');
    const panelsEl = document.getElementById('cloud-panels');
    const userInfoEl = document.getElementById('cloud-user-info');

    if (user) {
        signedOutEl.classList.add('hidden');
        signedInEl.classList.remove('hidden');
        panelsEl.classList.remove('hidden');
        userInfoEl.textContent = `👤 ${user.displayName || user.email}`;
        // Load both lists
        this._renderLocalForUpload();
        this.refreshCloudList();
        
        // Auto-sync missing cloud playlists to local device
        this._autoSyncCloudPlaylists();
    } else {
        signedOutEl.classList.remove('hidden');
        signedInEl.classList.add('hidden');
        panelsEl.classList.add('hidden');
        userInfoEl.textContent = '';
    }
};

UIManager.prototype._autoSyncCloudPlaylists = async function() {
    if (!window.cloudService || !window.cloudService.getCurrentUser()) return;
    try {
        const cloudDocs = await window.cloudService.listPlaylists();
        const local = await playlistManager.getAllPlaylists();
        const localNames = new Set(local.map(p => p.name));
        
        let syncedCount = 0;
        for (const d of cloudDocs) {
            const name = d.playlist?.name;
            if (name && !localNames.has(name)) {
                // Not found locally by name, so download
                const cloudData = await window.cloudService.getPlaylist(d.docId);
                await storage.importPlaylist(cloudData);
                syncedCount++;
            }
        }
        if (syncedCount > 0) {
            this.showToast(`Auto-synced ${syncedCount} new playlist${syncedCount > 1 ? 's' : ''} from cloud!`);
            if (this.currentView === 'library-view') {
                await this.renderPlaylists();
            }
            const modal = document.getElementById('cloud-sync-modal');
            if (modal && !modal.classList.contains('hidden')) {
                this._renderLocalForUpload();
            }
        }
    } catch (e) {
        console.error("Auto-sync failed", e);
    }
};

UIManager.prototype.cloudSignIn = async function () {
    const btn = document.getElementById('cloud-signin-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
    try {
        await window.cloudService.signIn();
        // Auth state change will update UI automatically
    } catch (e) {
        console.error('Sign in failed:', e);
        await dialog.alert('Sign in failed: ' + (e.message || 'Unknown error'), 'Cloud Sync');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '🔑 Sign in with Google'; }
    }
};

UIManager.prototype.cloudSignOut = async function () {
    try {
        await window.cloudService.signOut();
    } catch (e) {
        console.error('Sign out failed:', e);
    }
};

UIManager.prototype._renderLocalForUpload = async function () {
    const container = document.getElementById('cloud-local-list');
    if (!container) return;

    container.innerHTML = '<div style="color: var(--text-secondary); font-size:0.85rem;">Loading...</div>';
    const playlists = await playlistManager.getAllPlaylists();

    if (playlists.length === 0) {
        container.innerHTML = '<div style="color: var(--text-secondary); font-size:0.85rem;">No local playlists.</div>';
        return;
    }

    container.innerHTML = '';
    for (const pl of playlists) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding: 0.4rem 0; border-bottom: 1px solid var(--border-color); gap: 0.5rem;';
        row.innerHTML = `
            <span style="font-size:0.88rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;" title="${this.escapeHtml(pl.name)}">${this.escapeHtml(pl.icon || '📚')} ${this.escapeHtml(pl.name)}</span>
            <button class="btn btn-small btn-secondary" data-playlist-id="${pl.id}" style="flex-shrink:0; font-size:0.78rem;">☁️ Upload</button>
        `;
        row.querySelector('button').addEventListener('click', (e) => {
            this._uploadToCloud(pl.id, e.target);
        });
        container.appendChild(row);
    }
};

UIManager.prototype.refreshCloudList = async function () {
    const container = document.getElementById('cloud-remote-list');
    if (!container) return;

    container.innerHTML = '<div style="color: var(--text-secondary); font-size:0.85rem;">Loading...</div>';
    try {
        const docs = await window.cloudService.listPlaylists();

        if (docs.length === 0) {
            container.innerHTML = '<div style="color: var(--text-secondary); font-size:0.85rem;">No playlists in cloud yet.</div>';
            return;
        }

        // Sort by uploadedAt descending
        docs.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));

        container.innerHTML = '';
        for (const d of docs) {
            const name = d.playlist?.name || 'Untitled';
            const icon = d.playlist?.icon || '📚';
            const uploadedDate = d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : '';

            const row = document.createElement('div');
            row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding: 0.4rem 0; border-bottom: 1px solid var(--border-color); gap: 0.25rem;';
            row.innerHTML = `
                <div style="overflow:hidden; flex:1;">
                    <div style="font-size:0.88rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${this.escapeHtml(name)}">${this.escapeHtml(icon)} ${this.escapeHtml(name)}</div>
                    <div style="font-size:0.72rem; color:var(--text-secondary);">${uploadedDate}</div>
                </div>
                <div style="display:flex; gap:0.25rem; flex-shrink:0;">
                    <button class="btn btn-small btn-secondary" data-doc-id="${d.docId}" style="font-size:0.78rem;" title="Download to device">⬇️</button>
                    <button class="btn btn-small danger" data-doc-id="${d.docId}" style="font-size:0.78rem;" title="Delete from cloud">🗑️</button>
                </div>
            `;
            row.querySelectorAll('button')[0].addEventListener('click', (e) => {
                this._downloadFromCloud(d.docId, e.target);
            });
            row.querySelectorAll('button')[1].addEventListener('click', (e) => {
                this._deleteFromCloud(d.docId, name, e.target);
            });
            container.appendChild(row);
        }
    } catch (e) {
        console.error('Failed to list cloud playlists:', e);
        container.innerHTML = `<div style="color: var(--danger-color); font-size:0.85rem;">Failed to load: ${this.escapeHtml(e.message)}</div>`;
    }
};

UIManager.prototype._uploadToCloud = async function (playlistId, btn) {
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳';
    try {
        const exportData = await storage.exportPlaylist(playlistId);
        await window.cloudService.uploadPlaylist(exportData);
        btn.textContent = '✅';
        this.showToast('Playlist uploaded to cloud!');
        // Refresh cloud list
        await this.refreshCloudList();
        setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 2000);
    } catch (e) {
        console.error('Upload failed:', e);
        await dialog.alert('Upload failed: ' + (e.message || 'Unknown error'), 'Cloud Sync');
        btn.textContent = original;
        btn.disabled = false;
    }
};

UIManager.prototype._downloadFromCloud = async function (docId, btn) {
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳';
    try {
        const cloudData = await window.cloudService.getPlaylist(docId);
        await storage.importPlaylist(cloudData);
        btn.textContent = '✅';
        this.showToast('Playlist downloaded to device!');
        // Refresh local list
        await this._renderLocalForUpload();
        // Also refresh library if visible
        if (this.currentView === 'library-view') {
            await this.renderPlaylists();
        }
        setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 2000);
    } catch (e) {
        console.error('Download failed:', e);
        await dialog.alert('Download failed: ' + (e.message || 'Unknown error'), 'Cloud Sync');
        btn.textContent = original;
        btn.disabled = false;
    }
};

UIManager.prototype._deleteFromCloud = async function (docId, name, btn) {
    const confirmed = await dialog.confirm(`Delete "${name}" from the cloud? This cannot be undone.`, 'Delete Cloud Playlist');
    if (!confirmed) return;

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳';
    try {
        await window.cloudService.deletePlaylist(docId);
        this.showToast('Deleted from cloud.');
        await this.refreshCloudList();
    } catch (e) {
        console.error('Delete failed:', e);
        await dialog.alert('Delete failed: ' + (e.message || 'Unknown error'), 'Cloud Sync');
        btn.textContent = original;
        btn.disabled = false;
    }
};
