import { describe, it, expect } from 'vitest';
import logic from '@/lib/logic';

describe('normalizeText', () => {
  it('lowercases and trims', () => {
    expect(logic.normalizeText('  Hello World  ')).toBe('hello world');
  });

  it('strips punctuation and symbols', () => {
    expect(logic.normalizeText('Hello, world!')).toBe('hello world');
    expect(logic.normalizeText('¿Qué tal?')).toBe('qué tal');
  });

  it('collapses whitespace', () => {
    expect(logic.normalizeText('a   b\tc')).toBe('a b c');
  });

  it('handles null/undefined', () => {
    expect(logic.normalizeText(null)).toBe('');
    expect(logic.normalizeText(undefined)).toBe('');
  });
});

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(logic.levenshteinDistance('abc', 'abc')).toBe(0);
  });

  it('counts single edits', () => {
    expect(logic.levenshteinDistance('kitten', 'sitting')).toBe(3);
  });

  it('handles empty strings', () => {
    expect(logic.levenshteinDistance('', 'abc')).toBe(3);
    expect(logic.levenshteinDistance('abc', '')).toBe(3);
  });
});

describe('calculateSimilarity', () => {
  it('returns 100 for identical strings', () => {
    expect(logic.calculateSimilarity('hello', 'hello')).toBe(100);
  });

  it('returns 100 for two empty strings', () => {
    expect(logic.calculateSimilarity('', '')).toBe(100);
  });

  it('returns a partial score for different strings', () => {
    const score = logic.calculateSimilarity('hello', 'hallo');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });
});

describe('getDiffHTML', () => {
  it('marks matching words as correct', () => {
    const diff = logic.getDiffHTML('hello world', 'hello world');
    expect(diff.userHTML).toContain('char-correct');
    expect(diff.userHTML).not.toContain('char-wrong');
  });

  it('marks wrong and missing words', () => {
    const diff = logic.getDiffHTML('hello there', 'hello world');
    expect(diff.userHTML).toContain('char-wrong');
    expect(diff.correctHTML).toContain('char-missing');
  });

  it('escapes HTML in answers', () => {
    const diff = logic.getDiffHTML('<script>', 'safe');
    expect(diff.userHTML).not.toContain('<script>');
    expect(diff.userHTML).toContain('char-wrong');
    // Build the entity via concatenation to avoid tooling decoding it.
    expect(diff.userHTML).toContain('&' + 'lt;script' + '&' + 'gt;');
  });
});

describe('getDiffHTML (CJK)', () => {
  it('diffs Chinese character by character', () => {
    const diff = logic.getDiffHTML('你好世界', '你好朋友');
    expect(diff.userHTML).toContain('char-correct');
    expect(diff.userHTML).toContain('char-wrong');
    expect(diff.correctHTML).toContain('char-missing');
  });

  it('diffs Japanese character by character', () => {
    const diff = logic.getDiffHTML('こんにちは', 'こんばんは');
    expect(diff.userHTML).toContain('char-correct');
    expect(diff.userHTML).toContain('char-wrong');
  });
});

describe('mapLanguageCode', () => {
  it('maps all supported languages', () => {
    expect(logic.mapLanguageCode('en-US')).toBe('en');
    expect(logic.mapLanguageCode('zh-CN')).toBe('zh-CN');
    expect(logic.mapLanguageCode('zh-TW')).toBe('zh-TW');
    expect(logic.mapLanguageCode('zh-HK')).toBe('zh-HK');
    expect(logic.mapLanguageCode('ja-JP')).toBe('ja');
    expect(logic.mapLanguageCode('es-ES')).toBe('es');
    expect(logic.mapLanguageCode('fr-FR')).toBe('fr');
    expect(logic.mapLanguageCode('de-DE')).toBe('de');
    expect(logic.mapLanguageCode('ko-KR')).toBe('ko');
    expect(logic.mapLanguageCode('it-IT')).toBe('it');
  });

  it('passes through unknown codes', () => {
    expect(logic.mapLanguageCode('xx-XX')).toBe('xx-XX');
  });
});

describe('sortSentencesByOrder', () => {
  it('sorts by order ascending', () => {
    const input = [
      { id: 3, order: 2 },
      { id: 1, order: 0 },
      { id: 2, order: 1 }
    ];
    expect(logic.sortSentencesByOrder(input).map((s) => s.id)).toEqual([1, 2, 3]);
  });

  it('falls back to id when order is missing', () => {
    const input = [{ id: 5 }, { id: 2 }, { id: 9 }];
    expect(logic.sortSentencesByOrder(input).map((s) => s.id)).toEqual([2, 5, 9]);
  });

  it('does not mutate the input array', () => {
    const input = [
      { id: 2, order: 1 },
      { id: 1, order: 0 }
    ];
    logic.sortSentencesByOrder(input);
    expect(input[0].id).toBe(2);
  });
});
