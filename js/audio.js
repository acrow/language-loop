// Audio Playback Engine
class AudioEngine {
    constructor() {
        this.audioElement = document.getElementById('audio-player');
        this.currentPlaylist = [];
        this.currentIndex = 0;
        this.repeatCount = 2;
        this.pauseDuration = 1000; // milliseconds
        this.currentRepeat = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.loopMode = true;

        // Speech synthesis
        this.synth = window.speechSynthesis;
        this.voices = [];

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
    }

    loadVoices() {
        this.voices = this.synth.getVoices();
    }

    getVoiceForLanguage(lang) {
        // Find best voice for language
        const voicesForLang = this.voices.filter(voice => voice.lang.startsWith(lang.split('-')[0]));

        if (voicesForLang.length > 0) {
            // Prefer local voices
            const localVoice = voicesForLang.find(v => v.localService);
            return localVoice || voicesForLang[0];
        }

        return null;
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
        if (this.currentPlaylist.length === 0) return;

        this.isPlaying = true;
        this.isPaused = false;
        this.emit('playbackStateChange', { isPlaying: true, isPaused: false });

        await this.playCurrentSentence();
    }

    pause() {
        this.isPaused = true;
        this.isPlaying = false;
        this.synth.cancel();
        this.audioElement.pause();
        this.emit('playbackStateChange', { isPlaying: false, isPaused: true });
    }

    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentRepeat = 0;
        this.synth.cancel();
        this.audioElement.pause();
        this.emit('playbackStateChange', { isPlaying: false, isPaused: false });
    }

    next() {
        this.currentRepeat = 0;
        this.currentIndex = (this.currentIndex + 1) % this.currentPlaylist.length;
        this.emit('sentenceChange', {
            index: this.currentIndex,
            sentence: this.currentPlaylist[this.currentIndex]
        });

        if (this.isPlaying) {
            this.playCurrentSentence();
        }
    }

    previous() {
        this.currentRepeat = 0;
        this.currentIndex = this.currentIndex === 0
            ? this.currentPlaylist.length - 1
            : this.currentIndex - 1;
        this.emit('sentenceChange', {
            index: this.currentIndex,
            sentence: this.currentPlaylist[this.currentIndex]
        });

        if (this.isPlaying) {
            this.playCurrentSentence();
        }
    }

    jumpToSentence(index) {
        if (index >= 0 && index < this.currentPlaylist.length) {
            this.currentIndex = index;
            this.currentRepeat = 0;
            this.emit('sentenceChange', {
                index: this.currentIndex,
                sentence: this.currentPlaylist[this.currentIndex]
            });

            if (this.isPlaying) {
                this.playCurrentSentence();
            }
        }
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
            if (sentence.customAudio) {
                await this.playCustomAudio(sentence.customAudio);
            } else {
                await this.playTTS(sentence.targetText, sentence.targetLang);
            }

            // Handle repetition
            this.currentRepeat++;

            if (this.currentRepeat < this.repeatCount) {
                // Repeat same sentence after pause
                await this.sleep(this.pauseDuration);
                if (this.isPlaying) {
                    await this.playCurrentSentence();
                }
            } else {
                // Move to next sentence
                this.currentRepeat = 0;
                this.currentIndex++;

                if (this.currentIndex >= this.currentPlaylist.length) {
                    if (this.loopMode) {
                        // Loop back to start
                        this.currentIndex = 0;
                        await this.sleep(this.pauseDuration);
                        if (this.isPlaying) {
                            await this.playCurrentSentence();
                        }
                    } else {
                        // Playback complete
                        this.stop();
                        this.emit('playbackComplete');
                    }
                } else {
                    // Play next sentence after pause
                    await this.sleep(this.pauseDuration);
                    if (this.isPlaying) {
                        await this.playCurrentSentence();
                    }
                }
            }
        } catch (error) {
            console.error('Playback error:', error);
            this.stop();
        }
    }

    playTTS(text, lang) {
        return new Promise((resolve, reject) => {
            if (!text) {
                resolve();
                return;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;

            const voice = this.getVoiceForLanguage(lang);
            if (voice) {
                utterance.voice = voice;
            }

            utterance.onend = () => resolve();
            utterance.onerror = (error) => {
                console.error('TTS error:', error);
                resolve(); // Continue playback even if TTS fails
            };

            this.synth.cancel(); // Cancel any ongoing speech
            this.synth.speak(utterance);
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
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
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
            alert('Could not access microphone. Please check permissions.');
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
}

// Create global instance
const audioEngine = new AudioEngine();
