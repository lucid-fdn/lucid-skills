// ---------------------------------------------------------------------------
// gas-analyzer.ts -- Gas optimization analysis via pattern matching
// ---------------------------------------------------------------------------

import { findLineNumber } from '../utils/text.js';

export interface GasIssue {
  category: string;
  title: string;
  description: string;
  location: string;
  estimated_savings: number;
  recommendation: string;
}

export interface GasAnalysisResult {
  issues: GasIssue[];
  totalEstimatedSavings: number;
  summary: string;
}

function issue(
  category: string,
  title: string,
  description: string,
  location: string,
  estimated_savings: number,
  recommendation: string,
): GasIssue {
  return { category, title, description, location, estimated_savings, recommendation };
}

// ---------------------------------------------------------------------------
// Storage patterns
// ---------------------------------------------------------------------------

export function detectStorageInLoops(source: string): GasIssue[] {
  const results: GasIssue[] = [];
  const loopPattern = /(?:for|while)\s*\([^)]*\)\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = loopPattern.exec(source)) !== null) {
    const loopStart = match.index;
    let braceCount = 0;
    let loopEnd = loopStart;
    let foundStart = false;
    for (let i = loopStart; i < source.length; i++) {
      if (source[i] === '{') {
        braceCount++;
        foundStart = true;
      } else if (source[i] === '}') {
        braceCount--;
      }
      if (foundStart && braceCount === 0) {
        loopEnd = i;
        break;
      }
    }
    const loopBody = source.substring(loopStart, loopEnd);

    if (/\b(?:balances|_balances|allowances|_allowances|totalSupply|_totalSupply)\b/i.test(loopBody)) {
      const line = findLineNumber(source, match[0]);
      results.push(
        issue(
          'storage',
          'Storage Read Inside Loop',
          'Reading from storage inside a loop costs 2100 gas (cold) or 100 gas (warm) per SLOAD.',
          `Line ${line}`,
          2100,
          'Cache storage variables in memory before the loop.',
        ),
      );
    }

    if (/\b\w+\s*\[\s*\w+\s*\]\s*[=+\-]=/i.test(loopBody)) {
      const line = findLineNumber(source, match[0]);
      results.push(
        issue(
          'storage',
          'Storage Write Inside Loop',
          'Writing to storage inside a loop costs 5000-20000 gas per SSTORE.',
          `Line ${line}`,
          5000,
          'Accumulate changes in memory and write once after the loop.',
        ),
      );
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Unnecessary SLOADs
// ---------------------------------------------------------------------------

export function detectUnnecessarySloads(source: string): GasIssue[] {
  const results: GasIssue[] = [];

  const funcPattern = /function\s+(\w+)\s*\([^)]*\)[^{]*\{/g;
  let funcMatch: RegExpExecArray | null;

  while ((funcMatch = funcPattern.exec(source)) !== null) {
    const funcStart = funcMatch.index;
    let braceCount = 0;
    let funcEnd = funcStart;
    let foundStart = false;
    for (let i = funcStart; i < source.length; i++) {
      if (source[i] === '{') {
        braceCount++;
        foundStart = true;
      } else if (source[i] === '}') {
        braceCount--;
      }
      if (foundStart && braceCount === 0) {
        funcEnd = i;
        break;
      }
    }
    const funcBody = source.substring(funcStart, funcEnd);

    const stateVarReads = funcBody.match(/\b(_\w+|totalSupply|owner|balances)\b/g);
    if (stateVarReads) {
      const counts = new Map<string, number>();
      for (const v of stateVarReads) {
        counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      for (const [varName, count] of counts) {
        if (count >= 3) {
          const line = findLineNumber(source, funcMatch[0]);
          results.push(
            issue(
              'storage',
              'Repeated Storage Read',
              `State variable '${varName}' is read ${count} times in function '${funcMatch[1]}'. Each read costs gas.`,
              `Line ${line}`,
              100 * (count - 1),
              `Cache '${varName}' in a local variable at the start of the function.`,
            ),
          );
        }
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Data types and packing
// ---------------------------------------------------------------------------

export function detectPackingIssues(source: string): GasIssue[] {
  const results: GasIssue[] = [];

  const stringStoragePattern = /string\s+(?:public\s+|private\s+|internal\s+)?(\w+)\s*;/g;
  let match: RegExpExecArray | null;
  while ((match = stringStoragePattern.exec(source)) !== null) {
    const line = findLineNumber(source, match[0]);
    results.push(
      issue(
        'packing',
        'Consider bytes32 Over string',
        `State variable '${match[1]}' uses string type. If data fits in 32 bytes, bytes32 is cheaper.`,
        `Line ${line}`,
        20000,
        'Use bytes32 instead of string if the data fits within 32 bytes.',
      ),
    );
  }

  const smallUintPattern = /(?:uint8|uint16|uint32)\s+(?:public\s+|private\s+|internal\s+)?(\w+)\s*;/g;
  while ((match = smallUintPattern.exec(source)) !== null) {
    const before = source.substring(Math.max(0, match.index - 200), match.index);
    if (!/struct\s+\w+\s*\{/.test(before)) {
      const line = findLineNumber(source, match[0]);
      results.push(
        issue(
          'packing',
          'Small uint in Storage Without Packing',
          `Variable '${match[1]}' uses a small uint type outside a packed struct.`,
          `Line ${line}`,
          0,
          'Use uint256 for standalone storage variables, or pack into a struct.',
        ),
      );
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Loop optimizations
// ---------------------------------------------------------------------------

export function detectLoopOptimizations(source: string): GasIssue[] {
  const results: GasIssue[] = [];

  const lengthInLoopPattern = /for\s*\(\s*\w+\s+\w+\s*=\s*\d+\s*;\s*\w+\s*<\s*(\w+)\.length\s*;/g;
  let match: RegExpExecArray | null;
  while ((match = lengthInLoopPattern.exec(source)) !== null) {
    const line = findLineNumber(source, match[0]);
    results.push(
      issue(
        'loop',
        'Array Length in Loop Condition',
        `'${match[1]}.length' is evaluated on every iteration.`,
        `Line ${line}`,
        100,
        'Cache the array length in a local variable before the loop.',
      ),
    );
  }

  const postIncrPattern = /for\s*\([^)]*;\s*\w+\s*\+\+\s*\)/g;
  while ((match = postIncrPattern.exec(source)) !== null) {
    const line = findLineNumber(source, match[0]);
    results.push(
      issue(
        'loop',
        'Post-increment in Loop',
        'Using i++ instead of ++i costs slightly more gas.',
        `Line ${line}`,
        5,
        'Use ++i instead of i++ in for loop increments.',
      ),
    );
  }

  if (/for\s*\([^)]*;\s*\w+\s*<\s*\w+\.length/g.test(source)) {
    if (!/max|limit|MAX_/i.test(source)) {
      results.push(
        issue(
          'loop',
          'Potentially Unbounded Loop',
          'A loop iterates over an array without an apparent upper bound.',
          'For loop',
          0,
          'Add a maximum iteration limit or paginate the operation.',
        ),
      );
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Function visibility
// ---------------------------------------------------------------------------

export function detectVisibilityOptimizations(source: string): GasIssue[] {
  const results: GasIssue[] = [];

  const publicFuncPattern =
    /function\s+(\w+)\s*\([^)]*\)\s*public(?!\s+override)\s+(?!view|pure)/g;
  let match: RegExpExecArray | null;
  while ((match = publicFuncPattern.exec(source)) !== null) {
    const funcName = match[1]!;
    const internalCallPattern = new RegExp(`\\b${funcName}\\s*\\(`, 'g');
    const calls = source.match(internalCallPattern);
    if (calls && calls.length <= 1) {
      const line = findLineNumber(source, match[0]);
      results.push(
        issue(
          'visibility',
          'Public Function Could Be External',
          `Function '${funcName}' is public but never called internally.`,
          `Line ${line}`,
          200,
          `Change '${funcName}' from public to external to save gas on calldata decoding.`,
        ),
      );
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Other gas patterns
// ---------------------------------------------------------------------------

export function detectMiscGasIssues(source: string): GasIssue[] {
  const results: GasIssue[] = [];

  const requirePattern = /require\s*\([^,]+,\s*"([^"]{33,})"\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = requirePattern.exec(source)) !== null) {
    const line = findLineNumber(source, match[0]);
    results.push(
      issue(
        'misc',
        'Long Revert String',
        `Require message is ${match[1]!.length} chars. Each extra character adds deployment cost.`,
        `Line ${line}`,
        200,
        'Use custom errors (Solidity 0.8.4+) instead of require strings.',
      ),
    );
  }

  if (/require\s*\(\s*\w+\s*>\s*0/g.test(source)) {
    results.push(
      issue(
        'misc',
        'Use != 0 Instead of > 0 for Unsigned Integers',
        'For unsigned integers, != 0 is slightly cheaper than > 0.',
        'Require statements',
        3,
        'Replace > 0 with != 0 for uint comparisons.',
      ),
    );
  }

  const boolStoragePattern = /bool\s+(?:public\s+|private\s+|internal\s+)?(\w+)\s*;/g;
  while ((match = boolStoragePattern.exec(source)) !== null) {
    const before = source.substring(Math.max(0, match.index - 200), match.index);
    if (!/struct\s+\w+\s*\{/.test(before)) {
      const line = findLineNumber(source, match[0]);
      results.push(
        issue(
          'misc',
          'Boolean Storage Variable',
          `Storage variable '${match[1]}' is bool. Booleans cost extra gas due to masking.`,
          `Line ${line}`,
          100,
          'Consider using uint256(1) and uint256(0) instead of true/false.',
        ),
      );
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Full gas analysis
// ---------------------------------------------------------------------------

export function fullGasAnalysis(source: string): GasAnalysisResult {
  const issues: GasIssue[] = [];

  issues.push(...detectStorageInLoops(source));
  issues.push(...detectUnnecessarySloads(source));
  issues.push(...detectPackingIssues(source));
  issues.push(...detectLoopOptimizations(source));
  issues.push(...detectVisibilityOptimizations(source));
  issues.push(...detectMiscGasIssues(source));

  const seen = new Set<string>();
  const deduped = issues.filter((i) => {
    const key = `${i.title}:${i.location}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const totalEstimatedSavings = deduped.reduce((sum, i) => sum + i.estimated_savings, 0);

  const summary =
    deduped.length === 0
      ? 'No gas optimization issues found.'
      : `Found ${deduped.length} gas optimization issue(s) with estimated savings of ~${totalEstimatedSavings} gas.`;

  return { issues: deduped, totalEstimatedSavings, summary };
}
