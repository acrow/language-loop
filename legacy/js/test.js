// Test Manager
class TestManager {
    constructor() {
        this.currentPlaylistId = null;
        this.sentences = [];
        this.currentIndex = 0;
        this.testMode = 'writing'; // 'writing' or 'speaking'
        this.correctCount = 0;
        this.attemptedCount = 0;
        this.isListening = false;
    }

    async startTest(playlistId, mode) {
        this.currentPlaylistId = playlistId;
        this.testMode = mode;
        this.currentIndex = 0;
        this.correctCount = 0;
        this.attemptedCount = 0;

        // Load sentences, filtering out disabled ones
        const allSentences = await storage.getSentencesByPlaylist(playlistId);
        this.sentences = allSentences.filter(s => !s.disabled);

        if (this.sentences.length === 0) {
            await dialog.alert('No sentences in this playlist to test!', 'Notice');
            return false;
        }

        // Shuffle sentences for variety
        this.sentences = this.shuffleArray([...this.sentences]);

        return true;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    getCurrentSentence() {
        return this.sentences[this.currentIndex];
    }

    isComplete() {
        return this.currentIndex >= this.sentences.length;
    }

    async checkAnswer(userAnswer) {
        const currentSentence = this.getCurrentSentence();
        const correctAnswer = currentSentence.targetText;

        // Normalize both answers for comparison
        const normalizedUser = this.normalizeText(userAnswer);
        const normalizedCorrect = this.normalizeText(correctAnswer);

        const isCorrect = normalizedUser === normalizedCorrect;
        this.attemptedCount++;

        if (isCorrect) {
            this.correctCount++;
        }

        const similarity = this.calculateSimilarity(normalizedUser, normalizedCorrect);

        // Auto-reorder on perfect match
        if (isCorrect && similarity === 100) {
            currentSentence.successCount = (currentSentence.successCount || 0) + 1;
            await storage.updateSentence(currentSentence.id, { successCount: currentSentence.successCount });

            // Fetch all sentences to determine their current logical order
            const allSentences = await storage.getSentencesByPlaylist(this.currentPlaylistId);
            
            // Sort by successCount ascending, then original manual order ascending
            allSentences.sort((a, b) => {
                const sa = a.successCount || 0;
                const sb = b.successCount || 0;
                if (sa !== sb) return sa - sb;
                return a.order - b.order;
            });

            // Extract the new IDs and permanently save this new arrangement to the DB
            const newOrderIds = allSentences.map(s => s.id);
            await playlistManager.reorderSentences(newOrderIds);
        }

        return {
            isCorrect,
            userAnswer,
            correctAnswer,
            similarity
        };
    }

    normalizeText(text) {
        return LanguageLoopLogic.normalizeText(text);
    }

    calculateSimilarity(str1, str2) {
        return LanguageLoopLogic.calculateSimilarity(str1, str2);
    }

    levenshteinDistance(str1, str2) {
        return LanguageLoopLogic.levenshteinDistance(str1, str2);
    }

    // Generate HTML diff showing word-by-word differences
    getDiffHTML(userAnswer, correctAnswer) {
        return LanguageLoopLogic.getDiffHTML(userAnswer, correctAnswer);
    }

    escapeHtml(text) {
        return LanguageLoopLogic.escapeHtml(text);
    }

    nextSentence() {
        this.currentIndex++;
    }

    previousSentence() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
        }
    }

    getProgress() {
        return {
            current: this.currentIndex + 1,
            total: this.sentences.length,
            correct: this.correctCount,
            attempted: this.attemptedCount,
            percentage: this.attemptedCount > 0
                ? Math.round((this.correctCount / this.attemptedCount) * 100)
                : 0
        };
    }

    async startSpeechRecognition() {
        const currentSentence = this.getCurrentSentence();
        const playlist = await storage.getPlaylist(this.currentPlaylistId);
        const recognizedTextEl = document.getElementById('recognized-text');
        recognizedTextEl.textContent = '';
        recognizedTextEl.classList.remove('hidden');
        return new Promise((resolve, reject) => {
            audioEngine.startSpeechRecognition(
                playlist.targetLang,
                (transcript, isFinal) => {
                    // Update recognized text display
                    recognizedTextEl.textContent = transcript;
                },
                (audioBlob) => {
                    // Recognition ended
                    const finalTranscript = recognizedTextEl.textContent;
                    resolve(finalTranscript);
                }
            );
        });
    }

    stopSpeechRecognition() {
        audioEngine.stopSpeechRecognition();
    }
}

// Create global instance
const testManager = new TestManager();
