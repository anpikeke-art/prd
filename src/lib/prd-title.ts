const COPULA_PATTERN = /\b(?:merupakan|adalah|ialah|yakni|adalah sebuah|adalah suatu)\b/i;

function collapseWhitespace(input: string) {
  return input.replace(/\s+/g, ' ').trim();
}

function sanitizeTitle(input: string) {
  return collapseWhitespace(input)
    .replace(/[|<>]/g, '')
    .replace(/\s+-\s+.*$/, '')
    .replace(/\s+\|\s+.*$/, '');
}

export function inferProjectTitle(idea: string, fallback = 'PRD Project'): string {
  const text = sanitizeTitle(idea);
  if (!text) return fallback;

  if (text.length <= 40 && text.split(' ').length <= 6 && !COPULA_PATTERN.test(text)) {
    return text;
  }

  const copulaMatch = text.match(/^(.{1,80}?)\s+(?:merupakan|adalah|ialah|yakni)\b/i);
  if (copulaMatch?.[1]) {
    const head = sanitizeTitle(copulaMatch[1]);
    if (head) return head.slice(0, 80);
  }

  const firstWord = text.split(' ')[0]?.trim();
  if (firstWord && /[A-Z0-9]/.test(firstWord[0] ?? '')) {
    return firstWord.replace(/[^\w.-]/g, '').slice(0, 80) || fallback;
  }

  const sentence = text.split(/[។.!?]/)[0] ?? text;
  const words = sentence.split(' ').filter(Boolean);
  if (words.length <= 5) {
    return sanitizeTitle(words.join(' ')).slice(0, 80) || fallback;
  }

  return sanitizeTitle(words.slice(0, 5).join(' ')).slice(0, 80) || fallback;
}
