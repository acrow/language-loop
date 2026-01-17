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

        // Load sentences
        this.sentences = await storage.getSentencesByPlaylist(playlistId);

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

        return {
            isCorrect,
            userAnswer,
            correctAnswer,
            similarity: this.calculateSimilarity(normalizedUser, normalizedCorrect)
        };
    }

    normalizeText(text) {
        return text
            .toLowerCase()
            .trim()
            // Remove all punctuation and special characters
            .replace(/[.,!?;:'""\u201c\u201d\u2018\u2019\u3001\u3002\uff0c\uff01\uff1f\uff1b\uff1a\u300c\u300d\u300e\u300f\u2026\u2014\u2013\-\(\)\[\]\{\}]/g, '')
            .replace(/\s+/g, ' '); // Normalize whitespace
    }

    calculateSimilarity(str1, str2) {
        // Simple similarity calculation (Levenshtein distance)
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 100;

        const editDistance = this.levenshteinDistance(longer, shorter);
        return Math.round(((longer.length - editDistance) / longer.length) * 100);
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    // Generate HTML diff showing word-by-word differences
    getDiffHTML(userAnswer, correctAnswer) {
        const userWords = userAnswer.toLowerCase().split(/\s+/);
        const correctWords = correctAnswer.toLowerCase().split(/\s+/);

        let userHTML = '';
        let correctHTML = '';

        const maxLen = Math.max(userWords.length, correctWords.length);

        for (let i = 0; i < maxLen; i++) {
            const userWord = userWords[i] || '';
            const correctWord = correctWords[i] || '';

            if (userWord === correctWord) {
                // Correct word
                userHTML += `<span class="char-correct">${this.escapeHtml(userWord)}</span> `;
                correctHTML += `<span class="char-correct">${this.escapeHtml(correctWord)}</span> `;
            } else {
                // Different word
                if (userWord) {
                    userHTML += `<span class="char-wrong">${this.escapeHtml(userWord)}</span> `;
                }
                if (correctWord) {
                    correctHTML += `<span class="char-missing">${this.escapeHtml(correctWord)}</span> `;
                }
            }
        }

        return { userHTML: userHTML.trim(), correctHTML: correctHTML.trim() };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    nextSentence() {
        this.currentIndex++;
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
