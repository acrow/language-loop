// Cloud Sync UI methods
// Attached to UIManager.prototype to keep the core UI class focused.
// Requires: ui.js (UIManager), storage, playlistManager, dialog, events.

// Lazily load the Firebase-backed cloud module on first use.
// Returns the service instance, or null if it could not be loaded.
UIManager.prototype._ensureCloudService = async function () {
    if (window.cloudService) return window.cloudService;
    try {
        await import('./js/cloud.js');
    } catch (e) {
        console.error('Failed to load cloud module:', e);
        return null;
    }
    return window.cloudService || null;
};

UIManager.prototype.showCloudSyncModal = async function () {
    this.showModal('cloud-sync-modal');

    // Disable sign-in until the cloud module is ready so a fast click
    // can't hit an undefined window.cloudService.
    const signinBtn = document.getElementById('cloud-signin-btn');
    if (signinBtn) signinBtn.disabled = true;

    const service = await this._ensureCloudService();

    if (signinBtn) signinBtn.disabled = false;

    if (!service) {
        await dialog.alert('Cloud sync is unavailable right now. Please check your connection.', 'Cloud Sync');
        return;
    }

    if (service.getCurrentUser()) {
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

UIManager.prototype._autoSyncCloudPlaylists = async function () {
    if (!window.cloudService || !window.cloudService.getCurrentUser()) return;
    try {
        const cloudDocs = await window.cloudService.listPlaylists();
        const local = await playlistManager.getAllPlaylists();
        const localNames = new Set(local.map((p) => p.name));

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
        console.error('Auto-sync failed', e);
    }
};

UIManager.prototype.cloudSignIn = async function () {
    const btn = document.getElementById('cloud-signin-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Signing in...';
    }
    try {
        // Make sure the module is loaded before touching the service.
        const service = await this._ensureCloudService();
        if (!service) {
            throw new Error('Cloud sync is unavailable. Please check your connection.');
        }
        await service.signIn();
        // Auth state change will update UI automatically
    } catch (e) {
        console.error('Sign in failed:', e);
        await dialog.alert('Sign in failed: ' + (e.message || 'Unknown error'), 'Cloud Sync');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔑 Sign in with Google';
        }
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

    container.innerHTML = '<div class="skeleton-row"></div><div class="skeleton-row"></div><div class="skeleton-row"></div>';
    const playlists = await playlistManager.getAllPlaylists();
    playlists.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    if (playlists.length === 0) {
        container.innerHTML = '<div style="color: var(--text-secondary); font-size:0.85rem;">No local playlists.</div>';
        return;
    }

    container.innerHTML = '';
    for (const pl of playlists) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding: 0.4rem 0; border-bottom: 1px solid var(--border-color); gap: 0.5rem;';
        const vText = pl.version ? ` <span style="color:var(--text-secondary); font-size:0.75rem;">(v${pl.version})</span>` : '';
        row.innerHTML = `
            <span style="font-size:0.88rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;" title="${this.escapeHtml(pl.name)}">${this.escapeHtml(pl.icon || '📚')} ${this.escapeHtml(pl.name)}${vText}</span>
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

    container.innerHTML = '<div class="skeleton-row"></div><div class="skeleton-row"></div><div class="skeleton-row"></div>';
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
            const version = d.version || 1;
            const uploadedDate = d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : '';

            const row = document.createElement('div');
            row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding: 0.4rem 0; border-bottom: 1px solid var(--border-color); gap: 0.25rem;';
            row.innerHTML = `
                <div style="overflow:hidden; flex:1;">
                    <div style="font-size:0.88rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${this.escapeHtml(name)}">${this.escapeHtml(icon)} ${this.escapeHtml(name)} <span style="color:var(--text-secondary); font-size:0.75rem;">(v${version})</span></div>
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

        // Check for version conflict
        try {
            const cloudData = await window.cloudService.getPlaylist(exportData.playlist.cloudId);
            const cloudVersion = cloudData.version || 1;
            const localVersion = exportData.version || 1;
            if (cloudVersion > localVersion) {
                const proceed = await dialog.confirm(`The cloud version (v${cloudVersion}) is newer than your local version (v${localVersion}). Overwrite the cloud playlist anyway?`, 'Version Conflict');
                if (!proceed) {
                    btn.textContent = original;
                    btn.disabled = false;
                    return;
                }
            }
        } catch (e) {
            // Document doesn't exist in cloud yet, proceed normally
        }

        await window.cloudService.uploadPlaylist(exportData);
        btn.textContent = '✅';
        this.showToast('Playlist uploaded to cloud!');
        // Refresh cloud list
        await this.refreshCloudList();
        setTimeout(() => {
            btn.textContent = original;
            btn.disabled = false;
        }, 2000);
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

        // Check for version conflict locally
        const allLocal = await storage.getAllPlaylists();
        const existingLocal = cloudData.playlist.cloudId ? allLocal.find((p) => p.cloudId === cloudData.playlist.cloudId) : null;

        if (existingLocal) {
            const localVersion = existingLocal.version || 1;
            const cloudVersion = cloudData.version || 1;
            if (localVersion > cloudVersion) {
                const proceed = await dialog.confirm(`Your local version (v${localVersion}) is newer than the cloud version (v${cloudVersion}). Overwrite your local playlist anyway?`, 'Version Conflict');
                if (!proceed) {
                    btn.textContent = original;
                    btn.disabled = false;
                    return;
                }
            }
        }

        await storage.importPlaylist(cloudData);
        btn.textContent = '✅';
        this.showToast('Playlist downloaded to device!');
        // Refresh local list
        await this._renderLocalForUpload();
        // Also refresh library if visible
        if (this.currentView === 'library-view') {
            await this.renderPlaylists();
        }
        setTimeout(() => {
            btn.textContent = original;
            btn.disabled = false;
        }, 2000);
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

// Upload every local playlist to the cloud (text only)
UIManager.prototype._uploadAllToCloud = async function () {
    if (!window.cloudService || !window.cloudService.getCurrentUser()) return;

    const playlists = await playlistManager.getAllPlaylists();
    if (playlists.length === 0) {
        this.showToast('No local playlists to upload', 'warning');
        return;
    }

    let ok = 0;
    let fail = 0;
    for (const pl of playlists) {
        try {
            const exportData = await storage.exportPlaylist(pl.id);
            await window.cloudService.uploadPlaylist(exportData);
            ok++;
        } catch (e) {
            console.error('Upload all failed for', pl.name, e);
            fail++;
        }
    }

    this.showToast(`Uploaded ${ok} playlist(s)${fail ? `, ${fail} failed` : ''}`);
    await this.refreshCloudList();
};

// Download every cloud playlist to this device
UIManager.prototype._downloadAllFromCloud = async function () {
    if (!window.cloudService || !window.cloudService.getCurrentUser()) return;

    const docs = await window.cloudService.listPlaylists();
    if (docs.length === 0) {
        this.showToast('No cloud playlists to download', 'warning');
        return;
    }

    let ok = 0;
    let fail = 0;
    for (const d of docs) {
        try {
            const cloudData = await window.cloudService.getPlaylist(d.docId);
            await storage.importPlaylist(cloudData);
            ok++;
        } catch (e) {
            console.error('Download all failed for', d.docId, e);
            fail++;
        }
    }

    this.showToast(`Downloaded ${ok} playlist(s)${fail ? `, ${fail} failed` : ''}`);
    await this._renderLocalForUpload();
    if (this.currentView === 'library-view') {
        await this.renderPlaylists();
    }
};
