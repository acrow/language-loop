// Audio Playback Engine
class AudioEngine {
    constructor() {
        this.audioElement = document.getElementById('audio-player');
        this.currentPlaylist = [];
        this.currentIndex = 0;
        this.repeatCount = 2;
        this.currentPlaylistLang = 'en-US'; // Fallback lang for sentences without targetLang
        this.pauseDuration = 1000; // milliseconds
        this.currentRepeat = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.loopMode = true;
        this.resultStartIndex = 0;
        this.speechRate = 1.0; // Default speech rate
        this.preferredVoiceName = null; // Preferred voice name
        this.speakNativeLanguage = false; // Speak native language after target
        this.isJump = false;

        // Speech synthesis
        this.synth = window.speechSynthesis;
        this.voices = [];

        // Recording
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];

        // Sleep timer
        this.sleepTimerTimeout = null;
        this.sleepTimerEndTime = null;

        // Wake Lock API - prevents screen from locking during playback
        this.wakeLock = null;
        this.supportsWakeLock = 'wakeLock' in navigator;

        // Load voices
        this.loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }

        // Event listeners
        this.listeners = {
            sentenceChange: [],
            playbackStateChange: [],
            playbackComplete: []
        };

        // Setup wake lock visibility handler
        this.setupWakeLockHandlers();
    }

    loadVoices() {
        this.voices = this.synth.getVoices();
    }

    getVoiceForLanguage(lang, preferredVoiceName = null) {
        // If a preferred voice is specified, try to find it
        if (preferredVoiceName) {
            const preferredVoice = this.voices.find(voice => voice.name === preferredVoiceName);
            if (preferredVoice) {
                return preferredVoice;
            }
        }

        // Find best voice for language
        const voicesForLang = this.voices.filter(voice => voice.lang.startsWith(lang.split('-')[0]));

        if (voicesForLang.length === 0) {
            return null;
        }

        // Prefer local voices over remote
        const localVoice = voicesForLang.find(voice => voice.localService);
        return localVoice || voicesForLang[0];
    }

    getAvailableVoicesForLanguage(lang) {
        const langCode = lang.split('-')[0];
        return this.voices.filter(voice => voice.lang.startsWith(langCode));
    }

    loadPlaylist(sentences) {
        this.currentPlaylist = sentences;
        this.currentIndex = 0;
        this.currentRepeat = 0;
    }

    setPlaybackSettings(repeatCount, pauseDuration) {
        this.repeatCount = repeatCount;
        this.pauseDuration = pauseDuration * 1000; // convert to ms
    }

    async play() {
        console.log("play");
        if (this.currentPlaylist.length === 0) return;

        this.isPlaying = true;
        this.isPaused = false;
        this.emit('playbackStateChange', { isPlaying: true, isPaused: false });

        // Request wake lock to prevent screen from sleeping
        await this.requestWakeLock();

        await this.playCurrentSentence();
    }

    pause() {
        console.log("pause");
        this.isPaused = true;
        this.isPlaying = false;
        this.synth.cancel();
        this.audioElement.pause();
        this.emit('playbackStateChange', { isPlaying: false, isPaused: true });

        // Release wake lock when paused
        this.releaseWakeLock();
    }

    stop() {
        console.log("stop");
        this.isPlaying = false;
        this.isPaused = false;
        this.currentRepeat = 0;
        this.synth.cancel();
        this.audioElement.pause();
        this.emit('playbackStateChange', { isPlaying: false, isPaused: false });

        // Release wake lock when stopped
        this.releaseWakeLock();
    }

    next(isJump = true) {
        console.log("next", isJump);
        this.jumpToSentence((this.currentIndex + 1) % this.currentPlaylist.length, isJump);
    }

    previous(isJump = true) {
        console.log("previous", isJump);
        this.jumpToSentence((this.currentIndex - 1 + this.currentPlaylist.length) % this.currentPlaylist.length, isJump);
    }

    async jumpToSentence(index, isJump = true) {
        console.log("jumpToSentence", index);
        if (this.currentIndex === index) {
            if (this.isPaused) {
                await this.play();
            } else {
                this.pause();
            }
            return;
        }

        // Stop current audio playback to prevent overlapping
        this.synth.cancel();
        this.audioElement.pause();

        this.isJump = isJump;
        this.currentRepeat = 0;
        this.currentIndex = index;

        this.emit('sentenceChange', {
            index: this.currentIndex,
            sentence: this.currentPlaylist[this.currentIndex]
        });

        await this.playCurrentSentence();
    }

    async playCurrentSentence() {
        if (!this.isPlaying || this.currentPlaylist.length === 0) return;

        const sentence = this.currentPlaylist[this.currentIndex];
        this.emit('sentenceChange', {
            index: this.currentIndex,
            sentence,
            repeat: this.currentRepeat
        });

        try {
            // Play audio (custom or TTS)
            console.log("playCurrentSentence", this.currentIndex, this.currentRepeat);
            if (sentence.customAudio) {
                await this.playCustomAudio(sentence.customAudio);
            } else {
                // Use preferred voice for target language
                // Use sentence.targetLang if available, otherwise fall back to playlist's language
                const ttsLang = sentence.targetLang || this.currentPlaylistLang;
                await this.playTTS(sentence.targetText, ttsLang, this.preferredVoiceName);
            }

            // If this was a jump (user clicked next/prev/sentence), don't continue with repetition
            if (this.isJump) {
                this.isJump = false;
                return;
            }

            // Handle repetition
            this.currentRepeat++;
            await this.sleep(this.pauseDuration);

            if (this.currentRepeat < this.repeatCount) {
                console.log("playCurrentSentence repeat", this.currentIndex, this.currentRepeat);
                await this.playCurrentSentence();
            } else {
                console.log("playCurrentSentence end", this.currentIndex, this.currentRepeat);
                // Play native language once after all repetitions (if enabled)
                if (this.speakNativeLanguage && sentence.nativeText && sentence.nativeLang) {
                    // Small pause before native language
                    await this.sleep(300);
                    // Auto-select appropriate voice for native language
                    await this.playTTS(sentence.nativeText, sentence.nativeLang, null);
                    await this.sleep(this.pauseDuration);
                }

                this.currentRepeat = 0;
                this.next(false);
            }
        } catch (error) {
            console.error('Playback error:', error);
            this.stop();
        }
    }

    playTTS(text, lang, voiceName = undefined) {
        return new Promise((resolve, reject) => {
            if (!text) {
                resolve();
                return;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = this.speechRate; // Apply speech rate

            // Use provided voiceName, or fall back to preferredVoiceName, or auto-select
            const preferredVoice = voiceName !== undefined ? voiceName : this.preferredVoiceName;
            const voice = this.getVoiceForLanguage(lang, preferredVoice);
            if (voice) {
                utterance.voice = voice;
            }

            utterance.onend = () => resolve();
            utterance.onerror = (error) => {
                // Suppress interrupted/canceled errors - these are normal during playback control
                if (error.error === 'interrupted' || error.error === 'canceled') {
                    resolve(); // Just resolve silently
                    return;
                }
                // Only log actual errors
                console.error('TTS error:', error);
                resolve(); // Continue playback even if TTS fails
            };

            // Cancel any ongoing speech to ensure clean state
            // This will trigger "interrupted" errors on previous utterances, but we suppress those
            this.synth.cancel();

            // iOS Safari fix: Resume synthesis (required for iOS)
            if (this.synth.paused) {
                this.synth.resume();
            }

            // Small delay to ensure synthesis is ready
            setTimeout(() => {
                this.synth.speak(utterance);
            }, 10);
        });
    }

    playCustomAudio(audioBlob) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(audioBlob);
            this.audioElement.src = url;

            const onEnded = () => {
                URL.revokeObjectURL(url);
                this.audioElement.removeEventListener('ended', onEnded);
                this.audioElement.removeEventListener('error', onError);
                resolve();
            };

            const onError = (error) => {
                URL.revokeObjectURL(url);
                this.audioElement.removeEventListener('ended', onEnded);
                this.audioElement.removeEventListener('error', onError);
                reject(error);
            };

            this.audioElement.addEventListener('ended', onEnded);
            this.audioElement.addEventListener('error', onError);

            this.audioElement.play().catch(reject);
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Event system
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    // Recording functionality
    async startRecording() {
        try {
            // CRITICAL FIX: Always request fresh microphone access
            // This ensures browser asks for permission each time
            // and prevents stale stream issues
            if (this.mediaStream) {
                // Stop any existing stream first
                this.mediaStream.getTracks().forEach(track => track.stop());
            }

            // Request fresh microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            this.mediaRecorder = new MediaRecorder(this.mediaStream);
            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.start();
            return true;
        } catch (error) {
            console.error('Recording error:', error);
            await dialog.alert('Could not access microphone. Please check permissions.', 'Microphone Error');
            return false;
        }
    }

    stopRecording() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder) {
                resolve(null);
                return;
            }

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });

                // Stop all tracks
                this.mediaRecorder.stream.getTracks().forEach(track => track.stop());

                resolve(blob);
            };

            this.mediaRecorder.stop();
        });
    }

    // Validate language code for speech recognition
    validateLanguageCode(code) {
        // Common language codes that work with Web Speech API
        const supportedCodes = {
            'en-US': 'en-US',
            'en': 'en-US',
            'zh-CN': 'zh-CN',
            'zh': 'zh-CN',
            'ja-JP': 'ja-JP',
            'ja': 'ja-JP',
            'es-ES': 'es-ES',
            'es': 'es-ES',
            'fr-FR': 'fr-FR',
            'fr': 'fr-FR',
            'de-DE': 'de-DE',
            'de': 'de-DE'
        };

        return supportedCodes[code] || code; // Return code as-is if not in mapping
    }

    // Speech Recognition with Recording
    async startSpeechRecognition(lang, onResult, onEnd) {
        try {
            // Initialize speech recognition (reuse if exists)
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                const message = 'Speech recognition is not supported in this browser.\n\n' +
                    'For best results, please use:\n' +
                    '• Google Chrome (recommended)\n' +
                    '• Microsoft Edge\n' +
                    '• Safari (limited language support)';
                await dialog.alert(message);
                return false;
            }

            // Create recognition instance only once
            if (!this.recognition) {
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = true; // Keep it running
                this.recognition.interimResults = true;
                this.recognitionActive = false;
            }

            // Validate and update language for this session
            const langCode = this.validateLanguageCode(lang);
            if (!langCode) {
                await dialog.alert(`Language code "${lang}" may not be supported for speech recognition.\n\n` +
                    'Supported languages include:\n' +
                    '• English (en-US)\n' +
                    '• Chinese (zh-CN)\n' +
                    '• Japanese (ja-JP)\n\n' +
                    'Note: Chrome has the best language support.');
                return false;
            }
            this.recognition.lang = langCode;

            // Store callbacks for this session
            this.currentOnResult = onResult;
            this.currentOnEnd = onEnd;
            // this.resultStartIndex = 0; // Track where to start reading results

            // Set up event handlers
            this.recognition.onresult = (event) => {
                if (!this.recognitionActive) return; // Ignore if not actively listening

                // Only process results from the current session (after resultStartIndex)
                const transcript = Array.from(event.results)
                    .slice(this.resultStartIndex) // Only get new results
                    .map(result => result[0].transcript)
                    .join('');

                const isFinal = event.results[event.results.length - 1].isFinal;
                if (this.currentOnResult) {
                    this.currentOnResult(transcript, isFinal);
                }

                // Auto-stop on final result
                if (isFinal) {
                    // Update start index for next session
                    this.resultStartIndex = event.results.length;
                    this.stopSpeechRecognition();
                }
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'no-speech' || event.error === 'aborted') {
                    // These are normal, just stop
                    this.stopSpeechRecognition();
                }
            };

            this.recognition.onend = () => {
                // CRITICAL FIX: Don't restart - let stopSpeechRecognition handle cleanup
                // Restarting here can cause race conditions and lost transcripts
                // If recognition ends naturally, it means user stopped speaking
                // We should stop and process the results
                if (this.recognitionActive) {
                    // Recognition ended while still active - stop cleanly
                    this.stopSpeechRecognition();
                }
            };

            // Start recording audio
            const recordingStarted = await this.startRecording();
            if (!recordingStarted) {
                return false;
            }

            // Start recognition if not already running
            this.recognitionActive = true;
            if (!this.recognitionRunning) {
                this.recognition.start();
                this.recognitionRunning = true;
            }

            return true;
        } catch (error) {
            console.error('Speech recognition error:', error);
            await dialog.alert('Could not start speech recognition. Please check permissions.', 'Recognition Error');
            return false;
        }
    }

    async stopSpeechRecognition() {
        this.recognitionActive = false;
        this.recognitionRunning = false; // CRITICAL FIX: Reset running flag

        // Stop recognition properly
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (e) {
                // Already stopped, ignore
            }
        }

        // Stop recording and get audio
        const audioBlob = await this.stopRecording();

        // Call the end callback
        if (this.currentOnEnd) {
            this.currentOnEnd(audioBlob);
            this.currentOnEnd = null;
        }

        this.currentOnResult = null;

        // CRITICAL FIX: Reset resultStartIndex for next session
        this.resultStartIndex = 0;

        // CRITICAL FIX: Destroy and recreate recognition instance to ensure clean state
        if (this.recognition) {
            this.recognition.onresult = null;
            this.recognition.onerror = null;
            this.recognition.onend = null;
            this.recognition = null;
        }
    }

    // Sleep Timer
    setSleepTimer(minutes) {
        this.clearSleepTimer();

        if (minutes > 0) {
            const milliseconds = minutes * 60 * 1000;
            this.sleepTimerEndTime = Date.now() + milliseconds;

            this.sleepTimerTimeout = setTimeout(() => {
                this.stop();
                this.emit('sleepTimerExpired');
                this.sleepTimerEndTime = null;
            }, milliseconds);
        }
    }

    clearSleepTimer() {
        if (this.sleepTimerTimeout) {
            clearTimeout(this.sleepTimerTimeout);
            this.sleepTimerTimeout = null;
            this.sleepTimerEndTime = null;
        }
    }

    getSleepTimerRemaining() {
        if (!this.sleepTimerEndTime) return 0;
        const remaining = Math.max(0, this.sleepTimerEndTime - Date.now());
        return Math.ceil(remaining / 60000); // Return minutes
    }

    // Wake Lock Management
    setupWakeLockHandlers() {
        // Re-request wake lock when page becomes visible again
        document.addEventListener('visibilitychange', async () => {
            if (this.wakeLock !== null && document.visibilityState === 'visible') {
                await this.requestWakeLock();
            }
        });
    }

    async requestWakeLock() {
        // Only request if browser supports it and we're playing
        if (!this.supportsWakeLock || !this.isPlaying) {
            return;
        }

        try {
            this.wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock activated - screen will stay on');

            // Listen for wake lock release
            this.wakeLock.addEventListener('release', () => {
                console.log('Wake Lock released');
            });
        } catch (err) {
            // Wake lock request can fail (e.g., battery is too low)
            console.warn('Wake Lock request failed:', err);
        }
    }

    async releaseWakeLock() {
        if (this.wakeLock !== null) {
            try {
                await this.wakeLock.release();
                this.wakeLock = null;
                console.log('Wake Lock released manually');
            } catch (err) {
                console.warn('Wake Lock release failed:', err);
            }
        }
    }
}

// Create global instance
const audioEngine = new AudioEngine();
