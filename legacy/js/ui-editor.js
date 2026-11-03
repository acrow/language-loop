// Auto-extracted from ui.js. Methods are mixed into UIManager.prototype.

class UIManagerEditorMethods {
    // Sentence Editor
    showSentenceEditor(sentence = null) {
        this.editingSentenceId = sentence ? sentence.id : null;
        this.recordedAudio = sentence?.customAudio || null;

        document.getElementById('editor-title').textContent = sentence ? i18n.t('sentence.editSentence') : i18n.t('sentence.addSentence');
        document.getElementById('target-text-input').value = sentence?.targetText || '';
        document.getElementById('native-text-input').value = sentence?.nativeText || '';
        document.getElementById('memo-input').value = sentence?.memo || '';

        // Per-sentence playback speed (falls back to 1.0)
        const speed = sentence?.speechRate || 1.0;
        document.getElementById('sentence-speed-input').value = speed;
        document.getElementById('sentence-speed-value').textContent = parseFloat(speed).toFixed(1);

        // Set up memo toggle button
        const memoSection = document.getElementById('memo-section');
        const memoArrow = document.getElementById('toggle-memo-arrow');
        const memoLabel = document.getElementById('toggle-memo-label');
        const hasMemo = sentence?.memo && sentence.memo.trim();
        if (hasMemo) {
            // If editing a sentence that already has a memo, show it expanded
            memoSection.classList.remove('hidden');
            memoArrow.textContent = '▲';
            memoLabel.textContent = 'Memo (Optional)';
        } else {
            // Default: collapsed
            memoSection.classList.add('hidden');
            memoArrow.textContent = '▼';
            memoLabel.textContent = 'Add Memo (Optional)';
        }

        this.updateRecordingUI();
        this.showModal('editor-modal');
    }

    editSentence(sentence) {
        this.showSentenceEditor(sentence);
    }

    async saveSentence() {
        const targetText = document.getElementById('target-text-input').value.trim();
        const nativeText = document.getElementById('native-text-input').value.trim();
        const addAnother = document.getElementById('add-another-checkbox').checked;

        if (!targetText || !nativeText) {
            await dialog.alert('Please fill in both sentences', 'Validation Error');
            return;
        }

        const sentenceData = {
            targetText,
            nativeText,
            memo: document.getElementById('memo-input').value.trim(),
            customAudio: this.recordedAudio,
            speechRate: parseFloat(document.getElementById('sentence-speed-input').value) || 1.0
        };

        try {
            if (this.editingSentenceId) {
                await playlistManager.updateSentence(this.editingSentenceId, sentenceData);
            } else {
                await playlistManager.addSentence(playlistManager.currentPlaylistId, sentenceData);
            }

            // Reload sentences
            audioEngine.loadPlaylist(playlistManager.currentSentences);
            await this.renderSentences(playlistManager.currentSentences);

            // If 'Add Another' is checked and we're adding (not editing), clear form and keep open
            if (addAnother && !this.editingSentenceId) {
                document.getElementById('target-text-input').value = '';
                document.getElementById('native-text-input').value = '';
                // Clear and collapse memo section
                document.getElementById('memo-input').value = '';
                document.getElementById('memo-section').classList.add('hidden');
                document.getElementById('toggle-memo-arrow').textContent = '▼';
                document.getElementById('toggle-memo-label').textContent = 'Add Memo (Optional)';
                this.recordedAudio = null;
                this.updateRecordingUI();
                document.getElementById('sentence-speed-input').value = 1.0;
                document.getElementById('sentence-speed-value').textContent = '1.0';
                document.getElementById('target-text-input').focus();
            } else {
                this.hideModal('editor-modal');
            }
        } catch (error) {
            await dialog.alert('Error saving sentence: ' + error.message, 'Error');
        }
    }

    async confirmDeleteSentence(sentenceId) {
        if (await dialog.confirm('Delete this sentence?', 'Confirm Delete')) {
            try {
                await playlistManager.deleteSentence(sentenceId);
                audioEngine.loadPlaylist(playlistManager.currentSentences);
                await this.renderSentences(playlistManager.currentSentences);

                // Update player header display
                if (playlistManager.currentSentences.length > 0) {
                    const currentIndex = Math.min(audioEngine.currentIndex, playlistManager.currentSentences.length - 1);
                    this.updateCurrentSentence(currentIndex);
                } else {
                    // Clear display if no sentences left
                    document.getElementById('current-target-text').textContent = 'No sentences';
                    document.getElementById('current-native-text').textContent = '';
                    document.getElementById('current-position').textContent = '0';
                }
            } catch (error) {
                await dialog.alert('Error deleting sentence: ' + error.message, 'Error');
            }
        }
    }

    // Recording
    async toggleRecording() {
        if (this.isRecording) {
            await this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        const success = await audioEngine.startRecording();
        if (success) {
            this.isRecording = true;
            document.getElementById('record-btn').textContent = '⏹️' + i18n.t('common.stop');
            document.getElementById('recording-status').textContent = i18n.t('sentence.recording');
            document.getElementById('recording-status').classList.add('recording');

            // Auto-stop after 60 seconds to keep recordings small
            clearTimeout(this.recordingTimeout);
            this.recordingTimeout = setTimeout(() => {
                if (this.isRecording) this.stopRecording();
            }, 60000);
        }
    }

    async stopRecording() {
        clearTimeout(this.recordingTimeout);
        const audioBlob = await audioEngine.stopRecording();
        this.isRecording = false;
        this.recordedAudio = audioBlob;

        this.updateRecordingUI();
    }

    updateRecordingUI() {
        const recordBtn = document.getElementById('record-btn');
        const playBtn = document.getElementById('play-recording-btn');
        const deleteBtn = document.getElementById('delete-recording-btn');
        const status = document.getElementById('recording-status');

        if (this.recordedAudio) {
            recordBtn.textContent = '🎙️ ' + i18n.t('sentence.reRecordBtn');
            playBtn.classList.remove('hidden');
            deleteBtn.classList.remove('hidden');
            status.textContent = 'Custom audio ready';
            status.classList.remove('recording');
        } else {
            recordBtn.textContent = '🎙️ ' + i18n.t('sentence.recordBtn');
            playBtn.classList.add('hidden');
            deleteBtn.classList.add('hidden');
            status.textContent = '';
            status.classList.remove('recording');
        }
    }

    playRecording() {
        if (this.recordedAudio) {
            const url = URL.createObjectURL(this.recordedAudio);
            const audio = new Audio(url);
            audio.play();
            audio.onended = () => URL.revokeObjectURL(url);
        }
    }

    deleteRecording() {
        this.recordedAudio = null;
        this.updateRecordingUI();
    }

    // Auto-translate
    async autoTranslate() {
        const targetText = document.getElementById('target-text-input').value.trim();

        if (!targetText) {
            await dialog.alert('Please enter the target language sentence first', 'Validation Error');
            return;
        }

        const playlist = await playlistManager.getPlaylist(playlistManager.currentPlaylistId);
        if (!playlist) {
            await dialog.alert('Error: Could not load playlist information', 'Error');
            return;
        }

        // Show loading state
        const btn = document.getElementById('auto-translate-btn');
        const originalText = btn.textContent;
        btn.textContent = '⏳ Translating...';
        btn.disabled = true;

        try {
            const translation = await translationService.translate(
                targetText,
                playlist.targetLang,
                playlist.nativeLang
            );

            document.getElementById('native-text-input').value = translation;
        } catch (error) {
            await dialog.alert('Translation failed. Please enter translation manually.', 'Translation Error');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    // Voice Input
    async toggleVoiceInput() {
        if (this.isVoiceInput) {
            // Stop voice input
            audioEngine.stopSpeechRecognition();
            this.isVoiceInput = false;
            this.updateVoiceInputUI();
            return;
        }

        const playlist = await playlistManager.getPlaylist(playlistManager.currentPlaylistId);
        if (!playlist) {
            await dialog.alert('Error: Could not load playlist information', 'Error');
            return;
        }

        // Show loading state
        const btn = document.getElementById('voice-input-btn');
        const status = document.getElementById('voice-input-status');
        btn.textContent = '⏹️ Stop';
        btn.disabled = false;
        status.textContent = 'Listening...';
        status.classList.add('recording');
        this.isVoiceInput = true;

        // Start speech recognition with recording
        const success = await audioEngine.startSpeechRecognition(
            playlist.targetLang,
            (transcript, isFinal) => {
                // Update text field with transcript
                document.getElementById('target-text-input').value = transcript;
                if (isFinal) {
                    status.textContent = 'Processing...';
                }
            },
            (audioBlob) => {
                // Save the recorded audio
                this.recordedAudio = audioBlob;
                this.isVoiceInput = false;
                this.updateVoiceInputUI();
                this.updateRecordingUI();

                // Auto-translate if text was captured
                const targetText = document.getElementById('target-text-input').value.trim();
                if (targetText) {
                    this.autoTranslate();
                }
            }
        );

        if (!success) {
            this.isVoiceInput = false;
            this.updateVoiceInputUI();
        }
    }

    updateVoiceInputUI() {
        const btn = document.getElementById('voice-input-btn');
        const status = document.getElementById('voice-input-status');

        if (this.isVoiceInput) {
            btn.textContent = '⏹️ Stop';
            status.textContent = 'Listening...';
            status.classList.add('recording');
        } else {
            btn.textContent = '🎤 Voice Input';
            status.textContent = '';
            status.classList.remove('recording');
        }
    }

}

// Class methods are non-enumerable, so Object.assign would copy nothing.
Object.getOwnPropertyNames(UIManagerEditorMethods.prototype).forEach((name) => {
    if (name !== 'constructor') {
        Object.defineProperty(
            UIManager.prototype,
            name,
            Object.getOwnPropertyDescriptor(UIManagerEditorMethods.prototype, name)
        );
    }
});
