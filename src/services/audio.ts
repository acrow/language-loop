// Audio playback engine: TTS, custom audio, recording, speech recognition,
// sleep timer, and wake lock. Ported from the legacy `js/audio.js`.
// This service is UI-agnostic: it logs errors and returns booleans so the
// UI layer can decide how to surface them.

export interface AudioSentence {
  targetText: string;
  nativeText: string;
  targetLang?: string;
  nativeLang?: string;
  customAudio?: Blob | null;
  speechRate?: number | null;
  disabled?: boolean;
}

export type AudioEventName =
  'sentenceChange' | 'playbackStateChange' | 'playbackComplete' | 'sleepTimerExpired';

export type AudioListener = (data: unknown) => void;

export class AudioEngine {
  private audioElement: HTMLAudioElement;
  currentPlaylist: AudioSentence[] = [];
  currentIndex = 0;
  repeatCount = 2;
  currentPlaylistLang = 'en-US';
  pauseDuration = 1000;
  currentRepeat = 0;
  isPlaying = false;
  isPaused = false;
  loopMode = true;
  resultStartIndex = 0;
  speechRate = 1.0;
  preferredVoiceName: string | null = null;
  speakNativeLanguage = false;
  isJump = false;
  shuffleMode = false;
  shuffleHistory: number[] = [];

  private synth: SpeechSynthesis;
  voices: SpeechSynthesisVoice[] = [];

  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  private sleepTimerTimeout: ReturnType<typeof setTimeout> | null = null;
  private sleepTimerEndTime: number | null = null;

  private wakeLock: WakeLockSentinel | null = null;
  supportsWakeLock: boolean;

  private listeners: Record<AudioEventName, AudioListener[]> = {
    sentenceChange: [],
    playbackStateChange: [],
    playbackComplete: [],
    sleepTimerExpired: []
  };

  private recognition: SpeechRecognition | null = null;
  private recognitionActive = false;
  private recognitionRunning = false;
  private currentOnResult: ((transcript: string, isFinal: boolean) => void) | null = null;
  private currentOnEnd: ((audioBlob: Blob | null) => void) | null = null;

  constructor() {
    this.audioElement = new Audio();
    this.synth = window.speechSynthesis;
    this.supportsWakeLock = 'wakeLock' in navigator;

    this.loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }

    this.setupWakeLockHandlers();
  }

  loadVoices(): void {
    this.voices = this.synth.getVoices();
  }

  getVoiceForLanguage(
    lang: string,
    preferredVoiceName: string | null = null
  ): SpeechSynthesisVoice | null {
    if (preferredVoiceName) {
      const preferredVoice = this.voices.find((voice) => voice.name === preferredVoiceName);
      if (preferredVoice) return preferredVoice;
    }

    const voicesForLang = this.voices.filter((voice) => voice.lang.startsWith(lang.split('-')[0]));
    if (voicesForLang.length === 0) return null;

    const localVoice = voicesForLang.find((voice) => voice.localService);
    return localVoice || voicesForLang[0];
  }

  getAvailableVoicesForLanguage(lang: string): SpeechSynthesisVoice[] {
    const langCode = lang.split('-')[0];
    return this.voices.filter((voice) => voice.lang.startsWith(langCode));
  }

  loadPlaylist(sentences: AudioSentence[]): void {
    this.currentPlaylist = sentences;
    this.currentIndex = 0;
    this.currentRepeat = 0;
    this.shuffleHistory = [];
  }

  setPlaybackSettings(repeatCount: number, pauseDuration: number): void {
    this.repeatCount = repeatCount;
    this.pauseDuration = pauseDuration * 1000;
  }

  findNextEnabledIndex(startIndex: number, direction = 1): number {
    const total = this.currentPlaylist.length;
    if (total === 0) return -1;

    let count = 0;
    let index = startIndex;

    while (count < total) {
      if (!this.currentPlaylist[index].disabled) return index;
      index = (index + direction + total) % total;
      count++;
    }

    return -1;
  }

  async play(): Promise<void> {
    if (this.currentPlaylist.length === 0) return;

    if (this.currentPlaylist[this.currentIndex]?.disabled) {
      const nextEnabled = this.findNextEnabledIndex(this.currentIndex, 1);
      if (nextEnabled === -1) return;
      this.currentIndex = nextEnabled;
    }

    this.isPlaying = true;
    this.isPaused = false;
    this.emit('playbackStateChange', { isPlaying: true, isPaused: false });

    await this.requestWakeLock();
    await this.playCurrentSentence();
  }

  pause(): void {
    this.isPaused = true;
    this.isPlaying = false;
    this.synth.cancel();
    this.audioElement.pause();
    this.emit('playbackStateChange', { isPlaying: false, isPaused: true });
    this.releaseWakeLock();
  }

  stop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentRepeat = 0;
    this.synth.cancel();
    this.audioElement.pause();
    this.emit('playbackStateChange', { isPlaying: false, isPaused: false });
    this.releaseWakeLock();
  }

  next(isJump = true): void {
    if (this.currentPlaylist.length === 0) return;

    if (this.shuffleMode) {
      const nextIdx = this.getRandomEnabledIndex();
      if (nextIdx !== -1) {
        this.shuffleHistory.push(this.currentIndex);
        this.jumpToSentence(nextIdx, isJump);
      } else {
        this.stop();
      }
      return;
    }

    const nextIdx = this.findNextEnabledIndex(
      (this.currentIndex + 1) % this.currentPlaylist.length,
      1
    );
    if (nextIdx !== -1) {
      this.jumpToSentence(nextIdx, isJump);
    } else {
      this.stop();
    }
  }

  previous(isJump = true): void {
    if (this.currentPlaylist.length === 0) return;

    if (this.shuffleMode) {
      const prevIdx = this.shuffleHistory.pop();
      if (prevIdx !== undefined && prevIdx !== this.currentIndex) {
        this.jumpToSentence(prevIdx, isJump);
      } else {
        const randomIdx = this.getRandomEnabledIndex();
        if (randomIdx !== -1) this.jumpToSentence(randomIdx, isJump);
      }
      return;
    }

    const prevIdx = this.findNextEnabledIndex(
      (this.currentIndex - 1 + this.currentPlaylist.length) % this.currentPlaylist.length,
      -1
    );
    if (prevIdx !== -1) {
      this.jumpToSentence(prevIdx, isJump);
    }
  }

  getRandomEnabledIndex(): number {
    const enabled: number[] = [];
    this.currentPlaylist.forEach((s, i) => {
      if (!s.disabled) enabled.push(i);
    });
    if (enabled.length === 0) return -1;
    if (enabled.length === 1) return enabled[0];

    let idx: number;
    do {
      idx = enabled[Math.floor(Math.random() * enabled.length)];
    } while (idx === this.currentIndex);
    return idx;
  }

  toggleShuffle(): boolean {
    this.shuffleMode = !this.shuffleMode;
    this.shuffleHistory = [];
    return this.shuffleMode;
  }

  async jumpToSentence(index: number, isJump = true): Promise<void> {
    if (this.currentIndex === index) {
      if (isJump) {
        if (this.isPaused) {
          await this.play();
        } else {
          this.pause();
        }
        return;
      }
      // Automatic advance to the same index (e.g. a single enabled sentence):
      // replay it so playback keeps looping.
      this.currentRepeat = 0;
      await this.playCurrentSentence();
      return;
    }

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

  private async playCurrentSentence(): Promise<void> {
    if (!this.isPlaying || this.currentPlaylist.length === 0) return;

    const sentence = this.currentPlaylist[this.currentIndex];
    this.emit('sentenceChange', {
      index: this.currentIndex,
      sentence,
      repeat: this.currentRepeat
    });

    try {
      if (sentence.customAudio) {
        await this.playCustomAudio(sentence.customAudio);
      } else {
        const ttsLang = sentence.targetLang || this.currentPlaylistLang;
        await this.playTTS(
          sentence.targetText,
          ttsLang,
          this.preferredVoiceName ?? undefined,
          sentence.speechRate ?? undefined
        );
      }

      if (this.isJump) {
        this.isJump = false;
        return;
      }

      this.currentRepeat++;
      await this.sleep(this.pauseDuration);

      if (this.currentRepeat < this.repeatCount) {
        await this.playCurrentSentence();
      } else {
        if (this.speakNativeLanguage && sentence.nativeText && sentence.nativeLang) {
          await this.sleep(300);
          await this.playTTS(
            sentence.nativeText,
            sentence.nativeLang,
            null,
            sentence.speechRate ?? undefined
          );
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

  playTTS(text: string, lang: string, voiceName?: string | null, rate?: number): Promise<void> {
    return new Promise((resolve) => {
      if (!text) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate !== undefined && rate !== null ? rate : this.speechRate;

      const preferredVoice = voiceName !== undefined ? voiceName : this.preferredVoiceName;
      const voice = this.getVoiceForLanguage(lang, preferredVoice);
      if (voice) utterance.voice = voice;

      utterance.onend = () => resolve();
      utterance.onerror = (error) => {
        if (error.error === 'interrupted' || error.error === 'canceled') {
          resolve();
          return;
        }
        console.error('TTS error:', error);
        resolve();
      };

      this.synth.cancel();
      if (this.synth.paused) this.synth.resume();

      setTimeout(() => this.synth.speak(utterance), 10);
    });
  }

  playCustomAudio(audioBlob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(audioBlob);
      this.audioElement.src = url;

      const onEnded = () => {
        URL.revokeObjectURL(url);
        this.audioElement.removeEventListener('ended', onEnded);
        this.audioElement.removeEventListener('error', onError);
        resolve();
      };

      const onError = (error: Event | string) => {
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ---------------------------------------------------------------
  // Event system
  // ---------------------------------------------------------------
  on(event: AudioEventName, callback: AudioListener): void {
    this.listeners[event]?.push(callback);
  }

  off(event: AudioEventName, callback: AudioListener): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    }
  }

  private emit(event: AudioEventName, data: unknown): void {
    this.listeners[event]?.forEach((callback) => callback(data));
  }

  // ---------------------------------------------------------------
  // Recording
  // ---------------------------------------------------------------
  async startRecording(): Promise<boolean> {
    try {
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      try {
        this.mediaRecorder = new MediaRecorder(this.mediaStream, {
          audioBitsPerSecond: 32000
        });
      } catch {
        this.mediaRecorder = new MediaRecorder(this.mediaStream);
      }
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.recordedChunks.push(event.data);
      };

      this.mediaRecorder.start();
      return true;
    } catch (error) {
      console.error('Recording error:', error);
      return false;
    }
  }

  stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.mediaRecorder?.stream.getTracks().forEach((track) => track.stop());
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  // ---------------------------------------------------------------
  // Speech recognition
  // ---------------------------------------------------------------
  validateLanguageCode(code: string): string {
    const supportedCodes: Record<string, string> = {
      'en-US': 'en-US',
      en: 'en-US',
      'zh-CN': 'zh-CN',
      zh: 'zh-CN',
      'ja-JP': 'ja-JP',
      ja: 'ja-JP',
      'es-ES': 'es-ES',
      es: 'es-ES',
      'fr-FR': 'fr-FR',
      fr: 'fr-FR',
      'de-DE': 'de-DE',
      de: 'de-DE'
    };
    return supportedCodes[code] || code;
  }

  async startSpeechRecognition(
    lang: string,
    onResult: (transcript: string, isFinal: boolean) => void,
    onEnd: (audioBlob: Blob | null) => void
  ): Promise<boolean> {
    try {
      const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionCtor) {
        console.error('Speech recognition is not supported in this browser.');
        return false;
      }

      if (!this.recognition) {
        this.recognition = new SpeechRecognitionCtor();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognitionActive = false;
      }

      const langCode = this.validateLanguageCode(lang);
      this.recognition.lang = langCode;

      this.currentOnResult = onResult;
      this.currentOnEnd = onEnd;

      this.recognition.onresult = (event) => {
        if (!this.recognitionActive) return;

        const transcript = Array.from(event.results)
          .slice(this.resultStartIndex)
          .map((result) => result[0].transcript)
          .join('');

        const isFinal = event.results[event.results.length - 1].isFinal;
        this.currentOnResult?.(transcript, isFinal);

        if (isFinal) {
          this.resultStartIndex = event.results.length;
          this.stopSpeechRecognition();
        }
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech' || event.error === 'aborted') {
          this.stopSpeechRecognition();
        }
      };

      this.recognition.onend = () => {
        if (this.recognitionActive) {
          this.stopSpeechRecognition();
        }
      };

      const recordingStarted = await this.startRecording();
      if (!recordingStarted) return false;

      this.recognitionActive = true;
      if (!this.recognitionRunning) {
        this.recognition.start();
        this.recognitionRunning = true;
      }

      return true;
    } catch (error) {
      console.error('Speech recognition error:', error);
      return false;
    }
  }

  async stopSpeechRecognition(): Promise<void> {
    this.recognitionActive = false;
    this.recognitionRunning = false;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Already stopped.
      }
    }

    const audioBlob = await this.stopRecording();

    if (this.currentOnEnd) {
      this.currentOnEnd(audioBlob);
      this.currentOnEnd = null;
    }

    this.currentOnResult = null;
    this.resultStartIndex = 0;

    if (this.recognition) {
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
      this.recognition = null;
    }
  }

  // ---------------------------------------------------------------
  // Sleep timer
  // ---------------------------------------------------------------
  setSleepTimer(minutes: number): void {
    this.clearSleepTimer();

    if (minutes > 0) {
      const milliseconds = minutes * 60 * 1000;
      this.sleepTimerEndTime = Date.now() + milliseconds;

      this.sleepTimerTimeout = setTimeout(() => {
        this.stop();
        this.emit('sleepTimerExpired', null);
        this.sleepTimerEndTime = null;
      }, milliseconds);
    }
  }

  clearSleepTimer(): void {
    if (this.sleepTimerTimeout) {
      clearTimeout(this.sleepTimerTimeout);
      this.sleepTimerTimeout = null;
      this.sleepTimerEndTime = null;
    }
  }

  getSleepTimerRemaining(): number {
    if (!this.sleepTimerEndTime) return 0;
    const remaining = Math.max(0, this.sleepTimerEndTime - Date.now());
    return Math.ceil(remaining / 60000);
  }

  getSleepTimerRemainingSeconds(): number {
    if (!this.sleepTimerEndTime) return 0;
    return Math.max(0, Math.ceil((this.sleepTimerEndTime - Date.now()) / 1000));
  }

  // ---------------------------------------------------------------
  // Wake lock
  // ---------------------------------------------------------------
  private setupWakeLockHandlers(): void {
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && this.isPlaying) {
        await this.requestWakeLock();
      }
    });
  }

  async requestWakeLock(): Promise<void> {
    if (!this.supportsWakeLock || !this.isPlaying) return;
    if (this.wakeLock !== null) return;

    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> };
    };
    if (!nav.wakeLock) return;

    try {
      this.wakeLock = await nav.wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null;
        // The browser releases the lock when the page is hidden. Re-acquire it
        // when the page becomes visible again while playback is still active.
        if (this.isPlaying && document.visibilityState === 'visible') {
          void this.requestWakeLock();
        }
      });
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
    }
  }

  async releaseWakeLock(): Promise<void> {
    if (this.wakeLock !== null) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
      } catch (err) {
        console.warn('Wake Lock release failed:', err);
      }
    }
  }
}

export const audioEngine = new AudioEngine();
