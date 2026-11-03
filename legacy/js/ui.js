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
        this.setupKeyboardShortcuts();

        const versionEl = document.getElementById('app-version');
        if (versionEl) versionEl.textContent = 'v' + APP_VERSION;
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escape closes any open modal (the custom dialog handles its own Escape)
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal:not(.hidden)').forEach((modal) => {
                    if (modal.id === 'custom-dialog-modal') return;
                    modal.classList.add('hidden');
                });
                return;
            }

            // Playback shortcuts only in the player view
            if (this.currentView !== 'player-view') return;

            // Ignore typing in form fields
            const tag = (e.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePlayPause();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                audioEngine.next();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                audioEngine.previous();
            }
        });
    }

    async installApp() {
        this.hideModal('library-menu-modal');
        if (!app.deferredInstallPrompt) {
            this.showToast('Install is not available in this browser', 'warning');
            return;
        }
        app.deferredInstallPrompt.prompt();
        const choice = await app.deferredInstallPrompt.userChoice;
        app.deferredInstallPrompt = null;
        this.showToast(choice.outcome === 'accepted' ? 'Installing app...' : 'Install cancelled');
    }

    setupCloudSyncListener() {
        // React to auth changes emitted by the cloud module via the event bus.
        // The cloud module is lazy-loaded when the Cloud Sync modal is opened.
        let lastUserKey = undefined;
        const handleAuth = (user) => {
            const key = user ? user.uid : null;
            if (key === lastUserKey) return;
            lastUserKey = key;
            this._updateCloudAuthUI(user);
        };

        events.on('cloud:auth', handleAuth);
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

        document.getElementById('shuffle-btn')?.addEventListener('click', () => {
            const on = audioEngine.toggleShuffle();
            const btn = document.getElementById('shuffle-btn');
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            btn.style.color = on ? 'var(--accent-primary)' : '';
            this.showToast(on ? 'Shuffle on' : 'Shuffle off');
        });

        document.getElementById('prev-btn')?.addEventListener('click', () => {
            audioEngine.previous();
        });

        document.getElementById('add-sentence-btn')?.addEventListener('click', () => {
            this.showSentenceEditor();
        });

        document.getElementById('toggle-all-sentences-btn')?.addEventListener('click', () => {
            this.toggleAllSentences();
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

        document.getElementById('sentence-speed-input')?.addEventListener('input', (e) => {
            document.getElementById('sentence-speed-value').textContent = parseFloat(e.target.value).toFixed(1);
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

        // Full backup / restore
        document.getElementById('backup-all-btn')?.addEventListener('click', () => {
            this.backupAllData();
        });

        document.getElementById('restore-all-btn')?.addEventListener('click', () => {
            this.restoreAllData();
        });

        document.getElementById('restore-all-file-input')?.addEventListener('change', (e) => {
            this.handleRestoreAllFile(e.target.files[0]);
        });

        document.getElementById('install-app-btn')?.addEventListener('click', () => {
            this.installApp();
        });

        // Library search
        document.getElementById('library-search-input')?.addEventListener('input', (e) => {
            this.librarySearchTerm = e.target.value;
            this.filterLibrary(e.target.value);
        });

        // Study stats
        document.getElementById('study-stats-btn')?.addEventListener('click', () => {
            this.hideModal('playlist-menu-modal');
            this.showStudyStats();
        });

        document.getElementById('close-study-stats-btn')?.addEventListener('click', () => {
            this.hideModal('study-stats-modal');
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

        document.getElementById('cloud-upload-all-btn')?.addEventListener('click', () => {
            this._uploadAllToCloud();
        });

        document.getElementById('cloud-download-all-btn')?.addEventListener('click', () => {
            this._downloadAllFromCloud();
        });

        // Group modal
        document.getElementById('add-group-btn')?.addEventListener('click', () => {
            this.hideModal('library-menu-modal');
            this.showCreateGroupModal();
        });

        document.getElementById('close-create-group-btn')?.addEventListener('click', () => {
            this.hideModal('create-group-modal');
        });

        document.getElementById('cancel-create-group-btn')?.addEventListener('click', () => {
            this.hideModal('create-group-modal');
        });

        document.getElementById('group-create-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createGroup();
        });

        // Icon picker for group form
        document.querySelectorAll('.icon-option-group').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.icon-option-group').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                document.getElementById('group-icon').value = btn.dataset.icon;
            });
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
        const container = document.getElementById('playlists-container');
        const emptyState = document.getElementById('empty-library');

        // Show skeleton placeholders while loading
        if (container) {
            container.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>';
        }

        const [playlists, groups] = await Promise.all([
            playlistManager.getAllPlaylists(),
            playlistManager.getAllGroups()
        ]);

        const totalItems = playlists.length + groups.length;
        if (totalItems === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        container.innerHTML = '';

        // -------------------------------------------------------
        // Build a combined ordered list of groups + loose playlists
        // -------------------------------------------------------
        // Load persisted combined order (array of {type, id} objects)
        const savedCombined = await storage.getSetting('combinedOrder', null);

        // Map for quick lookup
        const groupMap = new Map(groups.map(g => [g.id, g]));
        const playlistMap = new Map(playlists.map(p => [p.id, p]));

        // Split playlists into grouped and ungrouped
        const groupedIds = new Set(playlists.filter(p => p.groupId).map(p => p.id));

        // Build display order
        let combinedItems = []; // Each item: { type: 'group'|'playlist', id }

        if (savedCombined && savedCombined.length > 0) {
            // Restore from saved order, add any new items at end
            const seenGroups = new Set();
            const seenPlaylists = new Set();
            for (const entry of savedCombined) {
                if (entry.type === 'group' && groupMap.has(entry.id)) {
                    combinedItems.push(entry);
                    seenGroups.add(entry.id);
                } else if (entry.type === 'playlist' && playlistMap.has(entry.id) && !groupedIds.has(entry.id)) {
                    combinedItems.push(entry);
                    seenPlaylists.add(entry.id);
                }
            }
            // Append new groups not in saved order
            for (const g of groups) {
                if (!seenGroups.has(g.id)) combinedItems.push({ type: 'group', id: g.id });
            }
            // Append new ungrouped playlists not in saved order
            for (const p of playlists) {
                if (!seenPlaylists.has(p.id) && !groupedIds.has(p.id)) {
                    combinedItems.push({ type: 'playlist', id: p.id });
                }
            }
        } else {
            // Default: groups first (by createdAt), then ungrouped playlists (newest first)
            groups.sort((a, b) => a.createdAt - b.createdAt)
                  .forEach(g => combinedItems.push({ type: 'group', id: g.id }));
            playlists.filter(p => !p.groupId)
                     .sort((a, b) => b.createdAt - a.createdAt)
                     .forEach(p => combinedItems.push({ type: 'playlist', id: p.id }));
        }

        // Render combined list
        for (const entry of combinedItems) {
            if (entry.type === 'group') {
                const group = groupMap.get(entry.id);
                if (!group) continue;
                const groupPlaylists = playlists.filter(p => p.groupId === group.id);
                // Sort playlists within group by their savedOrder within the group
                const savedGroupPlaylistOrder = await storage.getSetting(`groupPlaylistOrder_${group.id}`, null);
                if (savedGroupPlaylistOrder) {
                    const orderMap = new Map(savedGroupPlaylistOrder.map((id, i) => [id, i]));
                    groupPlaylists.sort((a, b) => {
                        const ia = orderMap.has(a.id) ? orderMap.get(a.id) : 9999;
                        const ib = orderMap.has(b.id) ? orderMap.get(b.id) : 9999;
                        return ia - ib;
                    });
                }
                const groupEl = await this.createGroupCard(group, groupPlaylists);
                container.appendChild(groupEl);
            } else {
                const playlist = playlistMap.get(entry.id);
                if (!playlist || playlist.groupId) continue;
                const count = await playlistManager.getSentenceCount(playlist.id);
                const card = this.createPlaylistCard(playlist, count);
                container.appendChild(card);
            }
        }

        // Attach combined drag-and-drop
        this._setupLibraryDragDrop(container);

        // Re-apply any active search filter
        this.filterLibrary(this.librarySearchTerm || '');
    }

    filterLibrary(term) {
        const q = (term || '').trim().toLowerCase();
        const container = document.getElementById('playlists-container');
        if (!container) return;

        container.querySelectorAll('.playlist-card').forEach((card) => {
            const text = card.textContent.toLowerCase();
            card.classList.toggle('hidden', q !== '' && !text.includes(q));
        });

        container.querySelectorAll('.group-card').forEach((group) => {
            const groupName = (group.querySelector('.group-name')?.textContent || '').toLowerCase();
            const visiblePlaylists = group.querySelectorAll('.playlist-card:not(.hidden)').length;
            const matches = q === '' || groupName.includes(q) || visiblePlaylists > 0;
            group.classList.toggle('hidden', !matches);
        });
    }

    // -----------------------------------------------
    // Group Card
    // -----------------------------------------------
    async createGroupCard(group, groupPlaylists) {
        const el = document.createElement('div');
        el.className = 'group-card' + (group.collapsed ? ' collapsed' : '');
        el.dataset.groupId = group.id;
        el.draggable = true;

        const count = groupPlaylists.length;

        el.innerHTML = `
            <div class="group-header">
                <span class="group-drag-handle" title="Drag to reorder">⋮⋮</span>
                <span class="group-icon">${this.escapeHtml(group.icon || '📁')}</span>
                <div class="group-info">
                    <div class="group-name">${this.escapeHtml(group.name)}</div>
                    <div class="group-count">${count} playlist${count !== 1 ? 's' : ''}</div>
                </div>
                <div class="group-actions">
                    <button class="group-collapse-btn" title="${group.collapsed ? 'Expand' : 'Collapse'}">
                        <i class="group-chevron">▾</i>
                    </button>
                    <button class="group-delete-btn" title="Delete group">🗑</button>
                </div>
            </div>
            <div class="group-playlists"></div>
        `;

        // Populate inner playlist cards
        const innerList = el.querySelector('.group-playlists');
        if (groupPlaylists.length === 0) {
            innerList.innerHTML = '<div class="group-empty-hint">Drop playlists here</div>';
        } else {
            for (const playlist of groupPlaylists) {
                const cnt = await playlistManager.getSentenceCount(playlist.id);
                const card = this.createPlaylistCard(playlist, cnt);
                innerList.appendChild(card);
            }
        }

        // Collapse toggle
        el.querySelector('.group-collapse-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            const nowCollapsed = !el.classList.contains('collapsed');
            el.classList.toggle('collapsed', nowCollapsed);
            el.querySelector('.group-collapse-btn').title = nowCollapsed ? 'Expand' : 'Collapse';
            await playlistManager.updateGroup(group.id, { collapsed: nowCollapsed });
        });

        // Delete group (only if empty)
        el.querySelector('.group-delete-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            const currentPlaylists = await playlistManager.getAllPlaylists();
            const inGroup = currentPlaylists.filter(p => p.groupId === group.id);
            if (inGroup.length > 0) {
                await dialog.alert(`Cannot delete "${group.name}" — it still has ${inGroup.length} playlist(s) inside. Move them out first.`, 'Group Not Empty');
                return;
            }
            if (await dialog.confirm(`Delete group "${group.name}"?`, 'Confirm Delete')) {
                await playlistManager.deleteGroup(group.id);
                // Remove from combinedOrder
                const saved = await storage.getSetting('combinedOrder', null) || [];
                const updated = saved.filter(e => !(e.type === 'group' && e.id === group.id));
                await storage.setSetting('combinedOrder', updated);
                await this.renderPlaylists();
                this.showToast(`Group "${group.name}" deleted`);
            }
        });

        return el;
    }

    // -----------------------------------------------
    // Unified Library Drag & Drop
    // -----------------------------------------------
    _setupLibraryDragDrop(container) {
        // State
        let dragSrcCard = null;   // a .playlist-card being dragged
        let dragSrcGroup = null;  // a .group-card being dragged

        const clearHighlights = () => {
            container.querySelectorAll('.drag-over, .drag-over-group').forEach(el => {
                el.classList.remove('drag-over', 'drag-over-group');
            });
        };

        // ---- Playlist card drag ----
        container.querySelectorAll('.playlist-card').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                dragSrcCard = card;
                dragSrcGroup = null;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', card.dataset.playlistId);
                setTimeout(() => card.classList.add('dragging'), 0);
                e.stopPropagation();
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                clearHighlights();
                dragSrcCard = null;
            });
        });

        // ---- Group card drag (reorder groups) ----
        container.querySelectorAll('.group-card').forEach(groupEl => {
            const handle = groupEl.querySelector('.group-drag-handle');

            groupEl.addEventListener('dragstart', (e) => {
                // Only start group drag if the handle is involved or playlist card didn't initiate
                if (dragSrcCard) return;
                dragSrcGroup = groupEl;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', 'group-' + groupEl.dataset.groupId);
                setTimeout(() => groupEl.classList.add('dragging'), 0);
            });

            groupEl.addEventListener('dragend', () => {
                groupEl.classList.remove('dragging');
                clearHighlights();
                dragSrcGroup = null;
            });

            // Playlist dropped onto group → move into group
            groupEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                clearHighlights();
                if (dragSrcCard) {
                    // Highlight the group as drop target
                    groupEl.classList.add('drag-over-group');
                } else if (dragSrcGroup && dragSrcGroup !== groupEl) {
                    groupEl.classList.add('drag-over-group');
                }
            });

            groupEl.addEventListener('dragleave', (e) => {
                // Only clear if leaving the group card entirely
                if (!groupEl.contains(e.relatedTarget)) {
                    groupEl.classList.remove('drag-over-group');
                }
            });

            groupEl.addEventListener('drop', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                clearHighlights();

                if (dragSrcCard) {
                    // Move playlist into this group
                    const playlistId = parseInt(dragSrcCard.dataset.playlistId);
                    const groupId = parseInt(groupEl.dataset.groupId);
                    await playlistManager.movePlaylistToGroup(playlistId, groupId);
                    await this._saveCombinedOrder(container);
                    await this.renderPlaylists();
                    this.showToast('Playlist moved into group');
                } else if (dragSrcGroup && dragSrcGroup !== groupEl) {
                    // Reorder groups by inserting before the hovered group
                    const topItems = [...container.children];
                    const srcIdx = topItems.indexOf(dragSrcGroup);
                    const dstIdx = topItems.indexOf(groupEl);
                    if (srcIdx < dstIdx) {
                        container.insertBefore(dragSrcGroup, groupEl.nextSibling);
                    } else {
                        container.insertBefore(dragSrcGroup, groupEl);
                    }
                    await this._saveCombinedOrder(container);
                }
            });
        });

        // ---- Playlist dropped onto another playlist card (reorder) ----
        container.querySelectorAll('.playlist-card').forEach(card => {
            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!dragSrcCard || dragSrcCard === card) return;
                clearHighlights();
                card.classList.add('drag-over');
            });

            card.addEventListener('dragleave', () => {
                card.classList.remove('drag-over');
            });

            card.addEventListener('drop', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                clearHighlights();
                if (!dragSrcCard || dragSrcCard === card) return;

                const srcInGroup = dragSrcCard.closest('.group-card');
                const dstInGroup = card.closest('.group-card');

                if (srcInGroup && dstInGroup && srcInGroup === dstInGroup) {
                    // Reorder within the same group
                    const innerList = srcInGroup.querySelector('.group-playlists');
                    const cards = [...innerList.querySelectorAll('.playlist-card')];
                    const srcIdx = cards.indexOf(dragSrcCard);
                    const dstIdx = cards.indexOf(card);
                    if (srcIdx < dstIdx) {
                        innerList.insertBefore(dragSrcCard, card.nextSibling);
                    } else {
                        innerList.insertBefore(dragSrcCard, card);
                    }
                    const newOrder = [...innerList.querySelectorAll('.playlist-card')].map(c => parseInt(c.dataset.playlistId));
                    await storage.setSetting(`groupPlaylistOrder_${parseInt(srcInGroup.dataset.groupId)}`, newOrder);
                } else if (!srcInGroup && !dstInGroup) {
                    // Both ungrouped – reorder in top-level container
                    const topItems = [...container.children];
                    const srcIdx = topItems.indexOf(dragSrcCard);
                    const dstIdx = topItems.indexOf(card);
                    if (srcIdx < dstIdx) {
                        container.insertBefore(dragSrcCard, card.nextSibling);
                    } else {
                        container.insertBefore(dragSrcCard, card);
                    }
                    await this._saveCombinedOrder(container);
                } else if (srcInGroup && !dstInGroup) {
                    // Move out of group, drop next to an ungrouped card
                    const playlistId = parseInt(dragSrcCard.dataset.playlistId);
                    await playlistManager.movePlaylistToGroup(playlistId, null);
                    const dstIdx = [...container.children].indexOf(card);
                    container.insertBefore(dragSrcCard, card);
                    await this._saveCombinedOrder(container);
                    await this.renderPlaylists();
                    this.showToast('Playlist removed from group');
                }
            });
        });

        // ---- Top-level container drag-over (for ungrouped drop zone) ----
        container.addEventListener('dragover', (e) => {
            if (!dragSrcCard) return;
            e.preventDefault();
        });

        container.addEventListener('drop', async (e) => {
            if (!dragSrcCard) return;
            // If dropped directly on container (not on card/group), move to ungrouped
            if (e.target === container) {
                const playlistId = parseInt(dragSrcCard.dataset.playlistId);
                const srcInGroup = dragSrcCard.closest('.group-card');
                if (srcInGroup) {
                    await playlistManager.movePlaylistToGroup(playlistId, null);
                    await this._saveCombinedOrder(container);
                    await this.renderPlaylists();
                    this.showToast('Playlist removed from group');
                }
            }
        });
    }

    async _saveCombinedOrder(container) {
        const items = [...container.children].map(el => {
            if (el.classList.contains('group-card')) {
                return { type: 'group', id: parseInt(el.dataset.groupId) };
            } else if (el.classList.contains('playlist-card')) {
                return { type: 'playlist', id: parseInt(el.dataset.playlistId) };
            }
            return null;
        }).filter(Boolean);
        await storage.setSetting('combinedOrder', items);
    }

    createPlaylistCard(playlist, sentenceCount) {
        const card = document.createElement('div');
        card.className = 'playlist-card';
        card.draggable = true;
        card.dataset.playlistId = playlist.id;

        const targetLangName = LANGUAGE_NAMES[playlist.targetLang] || playlist.targetLang;
        const nativeLangName = LANGUAGE_NAMES[playlist.nativeLang] || playlist.nativeLang;
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

    // -----------------------------------------------
    // Group Create/Delete
    // -----------------------------------------------
    showCreateGroupModal() {
        document.getElementById('group-name-input').value = '';
        document.getElementById('group-icon').value = '📁';
        document.querySelectorAll('.icon-option-group').forEach(b => b.classList.remove('selected'));
        const firstBtn = document.querySelector('.icon-option-group[data-icon="📁"]');
        if (firstBtn) firstBtn.classList.add('selected');
        this.showModal('create-group-modal');
    }

    async createGroup() {
        const name = document.getElementById('group-name-input').value.trim();
        const icon = document.getElementById('group-icon').value.trim() || '📁';

        if (!name) {
            await dialog.alert('Please enter a group name', 'Validation Error');
            return;
        }

        try {
            await playlistManager.createGroup(name, icon);
            this.hideModal('create-group-modal');
            await this.renderPlaylists();
            this.showToast(`Group "${name}" created`);
        } catch (error) {
            await dialog.alert('Error creating group: ' + error.message, 'Error');
        }
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

        if (sentence.disabled) {
            item.classList.add('disabled');
        }

        item.innerHTML = `
            <div class="drag-handle">⋮⋮</div>
            <div class="sentence-content">
                <div class="sentence-target">${this.escapeHtml(sentence.targetText)}</div>
                <div class="sentence-native">${this.escapeHtml(sentence.nativeText)}</div>
                ${sentence.memo ? `<div class="sentence-memo">📝 ${this.escapeHtml(sentence.memo)}</div>` : ''}
            </div>
            <div class="sentence-actions">
                <button class="btn edit-sentence-btn">Edit</button>
                <button class="btn toggle-sentence-btn">${sentence.disabled ? 'Enable' : 'Disable'}</button>
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

        item.querySelector('.toggle-sentence-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            sentence.disabled = !sentence.disabled;
            try {
                await storage.updateSentence(sentence.id, sentence);
                // Re-render the UI smoothly
                if (sentence.disabled) {
                    item.classList.add('disabled');
                    e.target.textContent = 'Enable';
                } else {
                    item.classList.remove('disabled');
                    e.target.textContent = 'Disable';
                }
            } catch (err) {
                console.error("Failed to toggle sentence state", err);
                this.showToast('Failed to save state', 'error');
            }
        });

        item.querySelector('.delete-sentence-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.confirmDeleteSentence(sentence.id);
        });

        return item;
    }

    async toggleAllSentences() {
        if (!playlistManager.currentSentences || playlistManager.currentSentences.length === 0) return;

        const allDisabled = playlistManager.currentSentences.every(s => s.disabled);
        const targetState = !allDisabled; // If all disabled, enable all. Else, disable all.

        const btn = document.getElementById('toggle-all-sentences-btn');
        const originalText = btn.textContent;
        btn.textContent = '⏳';
        btn.disabled = true;

        try {
            for (const sentence of playlistManager.currentSentences) {
                if (sentence.disabled !== targetState) {
                    sentence.disabled = targetState;
                    await storage.updateSentence(sentence.id, { disabled: targetState });
                }
            }
            await this.renderSentences(playlistManager.currentSentences);
            this.showToast(targetState ? 'All sentences disabled' : 'All sentences enabled');
        } catch (error) {
            console.error('Failed to toggle all sentences:', error);
            await dialog.alert('Failed to toggle sentences', 'Error');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
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

        // Update database order permanently
        await playlistManager.reorderSentences(newOrder);

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

    // Settings
    async showSettings() {
        // Get current playlist settings
        const playlist = await playlistManager.getPlaylist(playlistManager.currentPlaylistId);
        if (!playlist) {
            await dialog.alert('Please open a playlist first', 'Notice');
            return;
        }

        const settings = playlist.settings || { ...DEFAULT_PLAYLIST_SETTINGS };

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
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.remove('hidden');
        this._trapFocus(modal);
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.add('hidden');
        if (this._lastFocused && typeof this._lastFocused.focus === 'function') {
            this._lastFocused.focus();
            this._lastFocused = null;
        }
    }

    // Keep keyboard focus inside an open modal (accessibility)
    _trapFocus(modal) {
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        this._lastFocused = document.activeElement;
        const focusable = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        setTimeout(() => first.focus(), 50);

        if (modal._trapHandler) {
            modal.removeEventListener('keydown', modal._trapHandler);
        }
        modal._trapHandler = (e) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        modal.addEventListener('keydown', modal._trapHandler);
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
        this.showToast(`Theme changed to ${THEME_NAMES[theme] || theme}`);
    }
}

// Create global instance
const ui = new UIManager();
