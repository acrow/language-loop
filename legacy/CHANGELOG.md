# Changelog

All notable changes to Language Loop are documented here.

## [1.1.0] — 2026-10-29

### Security & Data Integrity
- Added Firestore security rules (`firestore.rules`, `firebase.json`) restricting access to each user's own playlists.
- Fixed sentence `order` integrity on add/delete/import/merge.
- Sentences now sort by the explicit `order` field instead of `id`.
- Session restore no longer toggles playback on reload.
- Translation language mapping now covers all 10 supported languages.

### Reliability & Offline
- Re-enabled the service worker with a complete asset cache and versioned cache name.
- Graceful IndexedDB failure handling (private mode, blocked DB, quota).
- Full backup/restore of all playlists, sentences, groups, and settings.
- Debounced/guarded session saving.
- Initialization retry dialog.

### Architecture & Maintainability
- Centralized constants (`js/constants.js`).
- Global event bus (`js/events.js`) used for cloud auth.
- Extracted pure logic into `js/logic.js` with a Vitest suite (20 tests).
- Split the UI into `ui.js`, `ui-library.js`, `ui-editor.js`, `ui-test.js`, `ui-cloud.js`.
- Added ESLint + Prettier configuration.
- Removed redundant welcome translations.

### Features
- CJK-aware answer diffing (character-by-character).
- Study stats modal (total/active/mastered/average).
- Keyboard shortcuts (Space, ←/→) in the player.
- Library search/filter.
- Cloud "Upload All" / "Download All".
- PWA install prompt button.
- Shuffle playback mode.
- Per-sentence playback speed.
- Accessibility: modal focus trapping, Escape-to-close, ARIA dialog semantics.

### Performance
- Firebase is lazy-loaded only when Cloud Sync is opened.
- Lower-bitrate audio recording with a 60-second cap.
- Loading skeletons for library and cloud lists.
- `content-visibility` for long lists.

## [1.0.0] — Initial release
- Playlist-based language learning with TTS, custom recordings, repetition, tests, groups, and cloud sync.
