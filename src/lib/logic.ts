// Pure, side-effect-free helpers.
// Ported from the legacy `js/logic.js` so they can be unit-tested in Node.

export function normalizeText(text: unknown): string {
  return (
    String(text == null ? '' : text)
      .toLowerCase()
      .trim()
      // Remove all punctuation and symbols across languages
      .replace(/[\p{P}\p{S}]/gu, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

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

export function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 100;

  const editDistance = levenshteinDistance(longer, shorter);
  return Math.round(((longer.length - editDistance) / longer.length) * 100);
}

export function escapeHtml(text: unknown): string {
  const str = String(text == null ? '' : text);
  // Build entities via concatenation so the source stays readable and
  // is not mangled by tools that decode HTML entities.
  return str
    .replace(/&/g, '&' + 'amp;')
    .replace(/</g, '&' + 'lt;')
    .replace(/>/g, '&' + 'gt;')
    .replace(/"/g, '&' + 'quot;')
    .replace(/'/g, '&' + '#39;');
}

// Split text into comparable tokens. CJK languages have no spaces, so
// compare character-by-character; other languages compare by word.
export function tokenize(text: unknown): string[] {
  const str = String(text == null ? '' : text).toLowerCase();
  const hasCJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/.test(str);
  if (hasCJK) {
    return Array.from(str.replace(/\s+/g, ''));
  }
  return str.split(/\s+/).filter(Boolean);
}

export interface DiffResult {
  userHTML: string;
  correctHTML: string;
}

// Generate HTML diff showing token-by-token differences
export function getDiffHTML(userAnswer: string, correctAnswer: string): DiffResult {
  const userWords = tokenize(userAnswer);
  const correctWords = tokenize(correctAnswer);

  let userHTML = '';
  let correctHTML = '';

  const maxLen = Math.max(userWords.length, correctWords.length);

  for (let i = 0; i < maxLen; i++) {
    const userWord = userWords[i] || '';
    const correctWord = correctWords[i] || '';

    if (userWord === correctWord) {
      userHTML += `<span class="char-correct">${escapeHtml(userWord)}</span> `;
      correctHTML += `<span class="char-correct">${escapeHtml(correctWord)}</span> `;
    } else {
      if (userWord) {
        userHTML += `<span class="char-wrong">${escapeHtml(userWord)}</span> `;
      }
      if (correctWord) {
        correctHTML += `<span class="char-missing">${escapeHtml(correctWord)}</span> `;
      }
    }
  }

  return { userHTML: userHTML.trim(), correctHTML: correctHTML.trim() };
}

// Map app language codes to the MyMemory translation API format
export function mapLanguageCode(code: string): string {
  const mapping: Record<string, string> = {
    'en-US': 'en',
    'zh-CN': 'zh-CN',
    'zh-TW': 'zh-TW',
    'zh-HK': 'zh-HK',
    'ja-JP': 'ja',
    'es-ES': 'es',
    'fr-FR': 'fr',
    'de-DE': 'de',
    'ko-KR': 'ko',
    'it-IT': 'it'
  };
  return mapping[code] || code;
}

// Sort sentences by explicit display order, falling back to id.
export function sortSentencesByOrder<T extends { id?: number; order?: number }>(
  sentences: T[]
): T[] {
  return sentences.slice().sort((a, b) => {
    const oa = a.order !== undefined ? a.order : (a.id ?? 0);
    const ob = b.order !== undefined ? b.order : (b.id ?? 0);
    if (oa !== ob) return oa - ob;
    return (a.id ?? 0) - (b.id ?? 0);
  });
}

const logic = {
  normalizeText,
  levenshteinDistance,
  calculateSimilarity,
  escapeHtml,
  tokenize,
  getDiffHTML,
  mapLanguageCode,
  sortSentencesByOrder
};

export default logic;
