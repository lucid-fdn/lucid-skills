// ---------------------------------------------------------------------------
// text.ts -- Text utilities for smart contract analysis
// ---------------------------------------------------------------------------

/** Normalize Solidity source code by stripping comments and excess whitespace. */
export function normalizeSource(source: string): string {
  let cleaned = source.replace(/\/\/.*$/gm, '');
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

/** Extract the line number where a pattern match occurs. */
export function findLineNumber(source: string, match: string): number {
  const idx = source.indexOf(match);
  if (idx === -1) return -1;
  return source.substring(0, idx).split('\n').length;
}

/** Count occurrences of a pattern in source code. */
export function countOccurrences(source: string, pattern: RegExp): number {
  const flags = 'g' + (pattern.flags.includes('i') ? 'i' : '');
  const matches = source.match(new RegExp(pattern.source, flags));
  return matches?.length ?? 0;
}

/** Check if a Solidity address is valid (0x followed by 40 hex chars). */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/** Truncate a string to maxLen, adding an ellipsis if truncated. */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

/** Extract function signatures from Solidity source code. */
export function extractFunctionSignatures(source: string): string[] {
  const regex = /function\s+(\w+)\s*\([^)]*\)/g;
  const signatures: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(source)) !== null) {
    signatures.push(m[0]!);
  }
  return signatures;
}

/** Extract pragma solidity version. */
export function extractPragmaVersion(source: string): string | null {
  const m = source.match(/pragma\s+solidity\s+([^;]+);/);
  return m?.[1]?.trim() ?? null;
}

/** Calculate a simple hash for deduplication of findings. */
export function hashFinding(category: string, title: string, location: string): string {
  const combined = `${category}:${title}:${location}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

/** Format a score as a bar for display. */
export function formatScoreBar(score: number, width: number = 20): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  const bar = '#'.repeat(filled) + '-'.repeat(empty);
  return `[${bar}] ${score}/100`;
}

/** Split source code into individual contract definitions. */
export function splitContracts(source: string): { name: string; body: string }[] {
  const regex = /(?:contract|library|interface)\s+(\w+)[^{]*\{/g;
  const contracts: { name: string; body: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = regex.exec(source)) !== null) {
    const name = m[1]!;
    const startIdx = m.index;
    let braceCount = 0;
    let endIdx = startIdx;
    let foundStart = false;

    for (let i = startIdx; i < source.length; i++) {
      if (source[i] === '{') {
        braceCount++;
        foundStart = true;
      } else if (source[i] === '}') {
        braceCount--;
      }
      if (foundStart && braceCount === 0) {
        endIdx = i + 1;
        break;
      }
    }

    contracts.push({ name, body: source.substring(startIdx, endIdx) });
  }

  return contracts;
}

/** Strip HTML tags from a string. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/** Format a number compactly. */
export function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}
