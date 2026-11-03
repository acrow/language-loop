# Language Loop 🎵

A Progressive Web App for learning foreign languages through audio repetition. Practice listening to sentences in your target language with configurable repetition and automatic text-to-speech.

## Tech stack

- **Vue 3** + **Vite** + **TypeScript**
- **Pinia** for state management
- **Vue Router** for navigation
- **Tailwind CSS** + **DaisyUI** (6 themes)
- **vue-i18n** (10 locales)
- **Firebase** (Firestore + Google Auth) for cloud sync
- **vite-plugin-pwa** for offline support
- **Vitest** + **Vue Test Utils** for tests

## Getting started

```bash
npm install
npm run dev
```

The app runs at http://localhost:5173/.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run test` | Run the Vitest suite |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |

## Project structure

```
src/
├── components/   # UI, playlist, player, editor, test, cloud components
├── composables/  # useAudio, useSpeech, useTheme, useDialog, useToast
├── constants/    # Languages, defaults, theme names
├── i18n/         # vue-i18n setup
├── lib/          # Pure logic (unit-tested)
├── router/       # Vue Router routes
├── services/     # IndexedDB, audio, translation, cloud
├── stores/       # Pinia stores
├── styles/       # Tailwind entry
├── types/        # TypeScript models
└── views/        # Welcome, Library, Player, Test
```

## Features

- **Playlists** — create, edit, delete, duplicate, merge, and organize into groups
- **Sentences** — target/native text, auto-translate, voice input, custom recording, per-sentence speed
- **Playback** — TTS, repeat, pause, shuffle, sleep timer, wake lock
- **Tests** — writing and speaking with CJK-aware diffing
- **Cloud sync** — Google sign-in, upload/download/delete
- **Themes** — 6 themes (dark, light, ocean, forest, sunset, midnight)
- **Languages** — 10 interface languages
- **PWA** — installable and offline-capable

## Legacy

The original vanilla-JS app is preserved in [`legacy/`](legacy/) for reference.

## License

Created for personal language learning. Feel free to use and modify!
