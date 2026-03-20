// ---------------------------------------------------------------------------
// utils/round.ts -- Shared rounding utility
// ---------------------------------------------------------------------------

/** Round a number to `d` decimal places. */
export function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
