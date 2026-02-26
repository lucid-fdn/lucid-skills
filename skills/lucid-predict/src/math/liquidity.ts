// ---------------------------------------------------------------------------
// math/liquidity.ts -- Liquidity scoring for prediction markets
// ---------------------------------------------------------------------------

export interface LiquidityResult {
  score: number;              // 0-100
  volumeComponent: number;    // 0-50
  liquidityComponent: number; // 0-50
  rating: 'low' | 'medium' | 'high';
}

/**
 * Composite liquidity score (0-100).
 *
 * volume_component    = min(50, (volume_usd / 100,000) * 50)
 * liquidity_component = min(50, (liquidity_usd / 50,000) * 50)
 * score = volume_component + liquidity_component
 */
export function liquidityScore(volumeUsd: number, liquidityUsd: number): LiquidityResult {
  const volumeComponent = Math.min(50, (Math.max(0, volumeUsd) / 100_000) * 50);
  const liquidityComponent = Math.min(50, (Math.max(0, liquidityUsd) / 50_000) * 50);
  const score = Math.round(volumeComponent + liquidityComponent);
  const rating = score < 30 ? 'low' : score < 70 ? 'medium' : 'high';

  return {
    score,
    volumeComponent: Math.round(volumeComponent),
    liquidityComponent: Math.round(liquidityComponent),
    rating,
  };
}
