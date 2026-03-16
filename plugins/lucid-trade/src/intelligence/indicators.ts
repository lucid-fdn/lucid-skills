// ---------------------------------------------------------------------------
// intelligence/indicators.ts -- Technical Analysis indicator functions
// ---------------------------------------------------------------------------
// Formulas sourced from skills/market-analysis/references/indicators.md
// All functions are pure — no side effects, no async, no external deps.
// ---------------------------------------------------------------------------

/**
 * Simple Moving Average.
 *
 * SMA[i] = sum(values[i - period + 1 : i + 1]) / period
 *
 * Returns one value per bar starting from index `period - 1`.
 * Returns [] if data length < period.
 */
export function sma(values: number[], period: number): number[] {
  if (values.length < period) return [];

  const result: number[] = [];
  let windowSum = 0;

  // Initial window
  for (let i = 0; i < period; i++) {
    windowSum += values[i]!;
  }
  result.push(windowSum / period);

  // Slide window
  for (let i = period; i < values.length; i++) {
    windowSum += values[i]! - values[i - period]!;
    result.push(windowSum / period);
  }

  return result;
}

/**
 * Exponential Moving Average.
 *
 * k = 2 / (period + 1)
 * EMA[0] = SMA of first `period` values (seed)
 * EMA[i] = values[i] * k + EMA[i-1] * (1 - k)
 *
 * Returns (values.length - period + 1) values.
 * Returns [] if data length < period.
 */
export function ema(values: number[], period: number): number[] {
  if (values.length < period) return [];

  const k = 2 / (period + 1);
  const result: number[] = [];

  // Seed with SMA of first `period` values
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i]!;
  }
  let prev = sum / period;
  result.push(prev);

  // Apply EMA formula
  for (let i = period; i < values.length; i++) {
    prev = values[i]! * k + prev * (1 - k);
    result.push(prev);
  }

  return result;
}

/**
 * Relative Strength Index with Wilder smoothing.
 *
 * Default period: 14
 *
 * Returns (closes.length - period - 1) values (need period+1 data for first RSI).
 * Returns [] if data length <= period.
 */
export function rsi(closes: number[], period = 14): number[] {
  if (closes.length <= period) return [];

  const deltas: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    deltas.push(closes[i]! - closes[i - 1]!);
  }

  // First avgGain / avgLoss from the first `period` deltas
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    const d = deltas[i]!;
    if (d > 0) avgGain += d;
    else avgLoss += Math.abs(d);
  }
  avgGain /= period;
  avgLoss /= period;

  const result: number[] = [];

  // First RSI
  if (avgLoss === 0) {
    result.push(100);
  } else {
    const rs = avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }

  // Subsequent RSI values using Wilder smoothing
  for (let i = period; i < deltas.length; i++) {
    const d = deltas[i]!;
    const currentGain = d > 0 ? d : 0;
    const currentLoss = d < 0 ? Math.abs(d) : 0;
    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }

  return result;
}

/**
 * MACD — Moving Average Convergence Divergence.
 *
 * MACD Line = EMA(close, fast) - EMA(close, slow)
 * Signal Line = EMA(MACD Line, signal)
 * Histogram = MACD Line - Signal Line
 *
 * Returns { macdLine, signalLine, histogram }.
 * Returns empty arrays if insufficient data.
 */
export function macd(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9,
): { macdLine: number[]; signalLine: number[]; histogram: number[] } {
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);

  if (slowEma.length === 0 || fastEma.length === 0) {
    return { macdLine: [], signalLine: [], histogram: [] };
  }

  // Align: fast EMA has more values than slow EMA.
  // offset = slow - fast values to skip from the beginning of fastEma
  const offset = slow - fast;
  const macdLine: number[] = [];
  for (let i = 0; i < slowEma.length; i++) {
    macdLine.push(fastEma[i + offset]! - slowEma[i]!);
  }

  // Signal line = EMA of MACD line
  const signalLine = ema(macdLine, signal);

  if (signalLine.length === 0) {
    return { macdLine, signalLine: [], histogram: [] };
  }

  // Histogram — aligned to signal line
  const signalOffset = macdLine.length - signalLine.length;
  const histogram: number[] = [];
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + signalOffset]! - signalLine[i]!);
  }

  return { macdLine, signalLine, histogram };
}

/**
 * Bollinger Bands.
 *
 * Middle = SMA(close, period)
 * StdDev = sqrt(sum((close[i] - Middle)^2 for window) / period)
 * Upper = Middle + stdDev * stdDevMultiplier
 * Lower = Middle - stdDev * stdDevMultiplier
 *
 * Returns { upper, middle, lower }.
 */
export function bollingerBands(
  closes: number[],
  period = 20,
  stdDevMultiplier = 2,
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = sma(closes, period);
  if (middle.length === 0) {
    return { upper: [], middle: [], lower: [] };
  }

  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < middle.length; i++) {
    const windowStart = i;
    const windowEnd = i + period;
    const mean = middle[i]!;

    let variance = 0;
    for (let j = windowStart; j < windowEnd; j++) {
      const diff = closes[j]! - mean;
      variance += diff * diff;
    }
    const sd = Math.sqrt(variance / period);

    upper.push(mean + stdDevMultiplier * sd);
    lower.push(mean - stdDevMultiplier * sd);
  }

  return { upper, middle, lower };
}

/**
 * Average True Range with Wilder smoothing.
 *
 * TR[i] = max(high-low, |high-prevClose|, |low-prevClose|)
 * ATR[0] = SMA of first `period` True Range values
 * ATR[i] = (ATR[i-1] * (period-1) + TR[i]) / period
 *
 * Returns ATR values starting after the seed period.
 */
export function atr(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): number[] {
  const n = highs.length;
  if (n < 2 || n !== lows.length || n !== closes.length) return [];

  // Compute True Range (starts at index 1 since we need prev close)
  const tr: number[] = [];
  for (let i = 1; i < n; i++) {
    const hl = highs[i]! - lows[i]!;
    const hpc = Math.abs(highs[i]! - closes[i - 1]!);
    const lpc = Math.abs(lows[i]! - closes[i - 1]!);
    tr.push(Math.max(hl, hpc, lpc));
  }

  if (tr.length < period) return [];

  // Seed ATR with SMA of first `period` TR values
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += tr[i]!;
  }
  let prevAtr = sum / period;
  const result: number[] = [prevAtr];

  // Wilder smoothing
  for (let i = period; i < tr.length; i++) {
    prevAtr = (prevAtr * (period - 1) + tr[i]!) / period;
    result.push(prevAtr);
  }

  return result;
}

/**
 * Historical Volatility (annualized, 365-day for crypto).
 *
 * logReturns[i] = ln(close[i] / close[i-1])
 * variance = average((logReturns - mean)^2)
 * HV = sqrt(variance * 365) * 100
 *
 * Returns a single percentage value. Returns 0 if insufficient data.
 */
export function historicalVolatility(
  closes: number[],
  lookback = 20,
): number {
  if (closes.length < 2) return 0;

  // Use at most `lookback` periods of log returns
  const startIdx = Math.max(1, closes.length - lookback);
  const logReturns: number[] = [];

  for (let i = startIdx; i < closes.length; i++) {
    const prev = closes[i - 1]!;
    const curr = closes[i]!;
    if (prev <= 0 || curr <= 0) continue;
    logReturns.push(Math.log(curr / prev));
  }

  if (logReturns.length < 2) return 0;

  const mean =
    logReturns.reduce((a, b) => a + b, 0) / logReturns.length;

  let variance = 0;
  for (const r of logReturns) {
    const diff = r - mean;
    variance += diff * diff;
  }
  variance /= logReturns.length;

  if (variance === 0) return 0;

  return Math.sqrt(variance * 365) * 100;
}
