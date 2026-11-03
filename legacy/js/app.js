// Main Application Controller
class App {
    constructor() {
        this.initialized = false;
        this.deferredInstallPrompt = null;
    }

    async init() {
        if (this.initialized) return;

        try {
            // Initialize storage
            await storage.init();

            // Migrate existing playlists to have settings
            await storage.migratePlaylistSettings();

            // Initialize theme
            await this.initTheme();

            // Initialize i18n
            await i18n.init();

            // Initialize dialog system
            dialog.init();

            // Initialize UI
            ui.init();

            // Initialize welcome manager
            await welcomeManager.init();

            // Check for existing data and restore session
            await this.restoreSession();

            // Capture the PWA install prompt for later use
            this.setupInstallPrompt();

            // Register service worker for offline support
            this.registerServiceWorker();

            this.initialized = true;
        } catch (error) {
            console.error('App initialization error:', error);
            const retry = await dialog.confirm(
                'Error initializing app.\n\n' +
                (error && error.message ? error.message : 'Unknown error') +
                '\n\nWould you like to retry?',
                'Initialization Error'
            );
            if (retry) {
                window.location.reload();
            }
        }
    }

    async restoreSession() {
        const playlists = await playlistManager.getAllPlaylists();

        if (playlists.length === 0) {
            // First time user - show welcome screen
            ui.showWelcomeView();
            return;
        }

        // Check for last played playlist
        const lastPlaylistId = await storage.getSetting('lastPlaylistId');

        if (lastPlaylistId) {
            const playlist = await playlistManager.getPlaylist(lastPlaylistId);
            if (playlist) {
                // Resume last session - restore playlist
                await ui.showPlayerView(lastPlaylistId);

                // Restore the last viewed sentence WITHOUT starting playback.
                // jumpToSentence() toggles play/pause, so we set the index and
                // refresh the display directly instead.
                const lastSentenceIndex = await storage.getSetting('lastSentenceIndex', 0);
                if (lastSentenceIndex > 0 && lastSentenceIndex < playlistManager.currentSentences.length) {
                    audioEngine.currentIndex = lastSentenceIndex;
                    ui.updateCurrentSentence(lastSentenceIndex);
                }
                return;
            }
        }

        // No valid last session - show library
        ui.showLibraryView();
    }

    async saveSession() {
        // Guard against concurrent writes: beforeunload and visibilitychange
        // can fire back-to-back, and overlapping IndexedDB transactions are wasteful.
        if (this._savingSession) return;
        this._savingSession = true;
        try {
            if (playlistManager.currentPlaylistId) {
                await storage.setSetting('lastPlaylistId', playlistManager.currentPlaylistId);
                await storage.setSetting('lastSentenceIndex', audioEngine.currentIndex);
            } else {
                // Clear saved playlist when no playlist is active
                await storage.deleteSetting('lastPlaylistId');
            }
        } catch (error) {
            console.warn('Failed to save session:', error);
        } finally {
            this._savingSession = false;
        }
    }

    // Debounced save used for visibility changes (avoids rapid repeated writes)
    scheduleSaveSession() {
        clearTimeout(this._saveSessionTimer);
        this._saveSessionTimer = setTimeout(() => this.saveSession(), 300);
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => console.log('Service Worker registered'))
                .catch(error => console.log('Service Worker registration failed:', error));
        }
    }

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent the mini-infobar and stash the event for a custom button
            e.preventDefault();
            this.deferredInstallPrompt = e;
        });
    }

    async initTheme() {
        try {
            // Load saved theme or use system preference
            const savedTheme = await storage.getSetting('theme');
            const theme = savedTheme || this.getSystemTheme();
            this.applyTheme(theme);
        } catch (error) {
            console.warn('Theme initialization failed, using default:', error);
            // Fallback to default theme if there's an error
            this.applyTheme('dark');
        }
    }

    getSystemTheme() {
        // Check system dark mode preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return 'dark'; // Default
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }
}

// Initialize app when DOM is ready
const app = new App();

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Save session before page unload (best effort — async writes may not finish)
window.addEventListener('beforeunload', () => {
    app.saveSession();
});

// Handle visibility change (mobile) — debounced to avoid duplicate writes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        app.scheduleSaveSession();
    }
});
