# Language Loop 🎵

A Progressive Web App for learning foreign languages through audio repetition. Practice listening to sentences in your target language with configurable repetition and automatic text-to-speech.

## Features

- 🎵 **Music Player Interface** - Familiar playlist-based learning
- 🔊 **Auto Text-to-Speech** - Automatic pronunciation in English, Chinese, and Japanese
- 🎙️ **Custom Voice Recording** - Record your own pronunciations
- 🔁 **Smart Repetition** - Configurable repeat count and pause duration
- 💾 **Local Storage** - All data saved on your device
- 📱 **Installable PWA** - Add to home screen on Android/iOS
- 🌙 **Dark Mode** - Beautiful, modern interface
- 📤 **Export/Import** - Share playlists as JSON files
- ⚡ **Offline Support** - Works without internet connection

## Getting Started

1. Open `index.html` in a modern web browser (Chrome, Edge, Safari)
2. Create your first playlist
3. Add sentences in your target language with translations
4. Configure repeat settings
5. Press play and start learning!

## Installation (Mobile)

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (⋮) → "Add to Home screen"
3. Launch from your home screen

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"

## How to Use

### Creating a Playlist
1. Click the "+" button in the library view
2. Enter a name for your playlist
3. Start adding sentences

### Adding Sentences
1. Click "Add" in the player view
2. Enter the sentence in your target language
3. Enter the translation in your native language
4. Select the languages
5. Optionally record custom pronunciation
6. Save

### Playback
- **Play/Pause**: Control playback
- **Next/Previous**: Navigate between sentences
- **Click sentence**: Jump to specific sentence
- The app will repeat each sentence based on your settings, then move to the next

### Settings
- **Repeat Count**: How many times to repeat each sentence (1-10)
- **Pause Duration**: Seconds between repetitions (0-10)

### Export/Import
- **Export**: Download playlist as JSON file (includes custom audio)
- **Import**: Upload JSON file to restore playlist

## Technical Details

- **Storage**: IndexedDB for local data persistence
- **Audio**: Web Speech API for TTS, MediaRecorder for custom audio
- **Offline**: Service Worker for offline functionality
- **Languages**: English (en-US), Chinese (zh-CN), Japanese (ja-JP)

## Browser Compatibility

Works best on:
- Chrome/Edge (desktop & mobile)
- Safari (iOS & macOS)
- Firefox (desktop & mobile)

**Note**: Voice quality depends on your browser and operating system. Chrome/Edge generally have the best TTS support.

## Privacy

All data is stored locally on your device. No data is sent to any server. Your playlists and recordings stay private.

## License

Created for personal language learning. Feel free to use and modify!
