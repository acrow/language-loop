// Auto-extracted from ui.js. Methods are mixed into UIManager.prototype.

class UIManagerTestMethods {
    // Test Functionality
    async playTestSentence() {
        const sentence = testManager.getCurrentSentence();
        if (!sentence) return;

        const playlist = await playlistManager.getPlaylist(testManager.currentPlaylistId);
        const lang = sentence.targetLang || (playlist && playlist.targetLang) || 'en-US';

        const btn = document.getElementById('play-test-sentence-btn');
        if (btn) btn.disabled = true;

        try {
            if (sentence.customAudio) {
                await audioEngine.playCustomAudio(sentence.customAudio);
            } else {
                await audioEngine.playTTS(sentence.targetText, lang);
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async startTest(mode) {
        const success = await testManager.startTest(playlistManager.currentPlaylistId, mode);
        if (!success) return;

        this.showTestView(mode);
        this.displayTestQuestion();
    }

    showTestView(mode) {
        // Hide all views
        document.getElementById('welcome-view').classList.add('hidden');
        document.getElementById('library-view').classList.add('hidden');
        document.getElementById('player-view').classList.add('hidden');
        document.getElementById('test-view').classList.remove('hidden');
        this.currentView = 'test';

        // Update title
        document.getElementById('test-mode-title').textContent =
            mode === 'writing' ? 'Writing Test' : 'Speaking Test';

        // Show appropriate input area
        if (mode === 'writing') {
            document.getElementById('writing-test-input').classList.remove('hidden');
            document.getElementById('speaking-test-input').classList.add('hidden');
        } else {
            document.getElementById('writing-test-input').classList.add('hidden');
            document.getElementById('speaking-test-input').classList.remove('hidden');
        }

        // Hide feedback and complete screens
        document.getElementById('test-feedback').classList.add('hidden');
        document.getElementById('test-complete').classList.add('hidden');
        document.getElementById('test-input-area').classList.remove('hidden');
    }

    displayTestQuestion() {
        const sentence = testManager.getCurrentSentence();
        const progress = testManager.getProgress();

        // Update progress
        document.getElementById('test-current').textContent = progress.current;
        document.getElementById('test-total').textContent = progress.total;
        document.getElementById('test-correct').textContent = progress.correct;
        document.getElementById('test-attempted').textContent = progress.attempted;

        // Display native language as prompt
        document.getElementById('test-prompt-text').textContent = sentence.nativeText;

        // Clear input
        document.getElementById('test-answer-input').value = '';
        document.getElementById('recognized-text').classList.add('hidden');
        document.getElementById('recognized-text').textContent = '';
    }

    async submitAnswer() {
        const userAnswer = document.getElementById('test-answer-input').value.trim();

        if (!userAnswer) {
            await dialog.alert('Please enter your answer', 'Validation Error');
            return;
        }

        const result = await testManager.checkAnswer(userAnswer);
        this.showFeedback(result);
    }

    async toggleSpeakAnswer() {
        const btn = document.getElementById('speak-answer-btn');
        const status = document.getElementById('speaking-status');

        if (testManager.isListening) {
            // Stop listening
            testManager.stopSpeechRecognition();
            testManager.isListening = false;
            btn.textContent = '🎤 ' + i18n.t('test.speakAnswer');
            status.textContent = '';
            status.classList.remove('recording');
            return;
        }

        // Start listening
        testManager.isListening = true;
        btn.textContent = '⏹️ Stop';
        status.textContent = 'Listening...';
        status.classList.add('recording');

        // Clear previous recognized text
        const recognizedTextEl = document.getElementById('recognized-text');
        recognizedTextEl.textContent = '';
        recognizedTextEl.classList.add('hidden');

        try {
            const transcript = await testManager.startSpeechRecognition();
            testManager.isListening = false;
            btn.textContent = '🎤 ' + i18n.t('test.speakAnswer');
            status.textContent = '';
            status.classList.remove('recording');

            if (transcript) {
                const result = await testManager.checkAnswer(transcript);
                this.showFeedback(result);
            }
        } catch (error) {
            console.error('Speech recognition error:', error);
            testManager.isListening = false;
            btn.textContent = '🎤 ' + i18n.t('test.speakAnswer');
            status.textContent = '';
            status.classList.remove('recording');
        }
    }

    showFeedback(result) {
        // Hide input area
        document.getElementById('test-input-area').classList.add('hidden');

        // Show feedback
        const feedbackEl = document.getElementById('test-feedback');
        feedbackEl.classList.remove('hidden');

        const messageEl = document.getElementById('feedback-message');
        const comparisonEl = document.getElementById('feedback-comparison');
        const nextBtn = document.getElementById('next-test-btn');

        if (result.isCorrect) {
            messageEl.textContent = '✅ ' + i18n.t('test.correct');
            messageEl.className = 'feedback-message correct';
            comparisonEl.innerHTML = `<div style="color: var(--success); font-size: 1.25rem;">${this.escapeHtml(result.userAnswer)}</div>`;
            nextBtn.textContent = i18n.t('test.nextSentence');
            nextBtn.dataset.action = 'next'; // Mark as next action
            nextBtn.style.display = 'inline-block';
        } else {
            messageEl.textContent = `❌ ${i18n.t('test.notQuite')} (${result.similarity}% match)`;
            messageEl.className = 'feedback-message incorrect';

            // Get character-by-character diff
            const diff = testManager.getDiffHTML(result.userAnswer, result.correctAnswer);

            comparisonEl.innerHTML = `
                <div class="diff-container">
                    <div class="diff-label">${i18n.t('test.yourAnswer')}:</div>
                    <div class="diff-text">${diff.userHTML}</div>
                </div>
                <div class="diff-container">
                    <div class="diff-label">${i18n.t('test.correctAnswer')}:</div>
                    <div class="diff-text">${diff.correctHTML}</div>
                </div>
            `;
            nextBtn.textContent = i18n.t('test.tryAgain');
            nextBtn.dataset.action = 'retry'; // Mark as retry action
            nextBtn.style.display = 'inline-block';
        }
    }

    nextTestQuestion() {
        const nextBtn = document.getElementById('next-test-btn');

        // Clear recognized text before showing input again
        const recognizedTextEl = document.getElementById('recognized-text');
        recognizedTextEl.textContent = '';
        recognizedTextEl.classList.add('hidden');

        // Only advance if the button action is "next" (meaning answer was correct)
        if (nextBtn.dataset.action === 'retry') {
            // Hide feedback, show input again for retry
            document.getElementById('test-feedback').classList.add('hidden');
            document.getElementById('test-input-area').classList.remove('hidden');

            // Auto-focus and select the input box for writing test
            if (testManager.testMode === 'writing') {
                const answerInput = document.getElementById('test-answer-input');
                answerInput.focus();
                answerInput.select();
            }
            return;
        }

        // Answer was correct, move to next sentence
        testManager.nextSentence();

        if (testManager.isComplete()) {
            this.showTestComplete();
        } else {
            // Hide feedback, show input
            document.getElementById('test-feedback').classList.add('hidden');
            document.getElementById('test-input-area').classList.remove('hidden');
            this.displayTestQuestion();

            // Auto-focus the input box for writing test
            if (testManager.testMode === 'writing') {
                document.getElementById('test-answer-input').focus();
            }
        }
    }

    showTestComplete() {
        const progress = testManager.getProgress();

        // Hide input and feedback
        document.getElementById('test-input-area').classList.add('hidden');
        document.getElementById('test-feedback').classList.add('hidden');

        // Show complete screen
        const completeEl = document.getElementById('test-complete');
        completeEl.classList.remove('hidden');

        document.getElementById('final-score').textContent = progress.correct;
        document.getElementById('final-total').textContent = progress.total;
        document.getElementById('final-percentage').textContent = progress.percentage;
    }

    retryTest() {
        this.startTest(testManager.testMode);
    }

    // Navigate to previous sentence in test
    previousTestSentence() {
        testManager.previousSentence();
        this.resetTestQuestion();
    }

    // Navigate to next sentence in test
    nextTestSentence() {
        testManager.nextSentence();
        if (testManager.isComplete()) {
            // Don't go past the end, go back to last sentence
            testManager.previousSentence();
        } else {
            this.resetTestQuestion();
        }
    }

    // Reset the current question (clear input, hide feedback)
    resetTestQuestion() {
        // Clear input
        const answerInput = document.getElementById('test-answer-input');
        if (answerInput) answerInput.value = '';

        // Clear recognized text
        const recognizedTextEl = document.getElementById('recognized-text');
        if (recognizedTextEl) {
            recognizedTextEl.textContent = '';
            recognizedTextEl.classList.add('hidden');
        }

        // Hide feedback, show input
        document.getElementById('test-feedback').classList.add('hidden');
        document.getElementById('test-input-area').classList.remove('hidden');

        // Update the display
        this.displayTestQuestion();

        // Auto-focus for writing test
        if (testManager.testMode === 'writing') {
            answerInput?.focus();
        }
    }

}

// Class methods are non-enumerable, so Object.assign would copy nothing.
Object.getOwnPropertyNames(UIManagerTestMethods.prototype).forEach((name) => {
    if (name !== 'constructor') {
        Object.defineProperty(
            UIManager.prototype,
            name,
            Object.getOwnPropertyDescriptor(UIManagerTestMethods.prototype, name)
        );
    }
});
