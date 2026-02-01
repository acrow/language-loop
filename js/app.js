// Main Application Controller
class App {
    constructor() {
        this.initialized = false;
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

            // Register service worker (disabled during development to prevent caching issues)
            // Uncomment this before deploying to production
            // this.registerServiceWorker();

            this.initialized = true;
        } catch (error) {
            console.error('App initialization error:', error);
            await dialog.alert('Error initializing app. Please refresh the page.', 'Error');
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
                ui.showPlayerView(lastPlaylistId);

                // Optionally restore playback position
                const lastSentenceIndex = await storage.getSetting('lastSentenceIndex', 0);
                if (lastSentenceIndex > 0 && lastSentenceIndex < playlistManager.currentSentences.length) {
                    audioEngine.jumpToSentence(lastSentenceIndex);
                }
                return;
            }
        }

        // No valid last session - show library
        ui.showLibraryView();
    }

    async saveSession() {
        if (playlistManager.currentPlaylistId) {
            await storage.setSetting('lastPlaylistId', playlistManager.currentPlaylistId);
            await storage.setSetting('lastSentenceIndex', audioEngine.currentIndex);
        } else {
            // Clear saved playlist when no playlist is active
            await storage.deleteSetting('lastPlaylistId');
        }
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => console.log('Service Worker registered'))
                .catch(error => console.log('Service Worker registration failed:', error));
        }
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

// Save session before page unload
window.addEventListener('beforeunload', () => {
    app.saveSession();
});

// Handle visibility change (mobile)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        app.saveSession();
    }
});
