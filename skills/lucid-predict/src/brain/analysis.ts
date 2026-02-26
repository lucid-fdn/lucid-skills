// ---------------------------------------------------------------------------
// brain/analysis.ts -- Core evaluation engine
// ---------------------------------------------------------------------------

import {
  expectedValue,
  kellyFraction,
  analyzeEfficiency,
  liquidityScore,
  daysToClose,
  timeDecayScore,
  isNearCertainExpiry,
  estimateProbability,
} from '../math/index.js';
import type { EvaluateResult, EvaluationParams, MarketVerdict, EdgeType } from './types.js';

const RULESET_VERSION = '1.0.0';

/**
 * Run full evaluation on a single market.
 * This is the core brain function — combines all math into a structured result.
 */
export function runEvaluation(params: EvaluationParams): EvaluateResult {
  const { market, bankroll, maxFraction = 0.25, adjustments = [] } = params;
  const marketPrice = market.currentPrices.yes;

  // Step 1: Determine estimated probability
  let estimatedProb: number;
  let baseRate: number;

  if (params.estimatedProbability != null) {
    estimatedProb = params.estimatedProbability;
    baseRate = params.estimatedProbability;
  } else if (adjustments.length > 0) {
    baseRate = marketPrice;
    estimatedProb = estimateProbability(baseRate, adjustments);
  } else {
    // No estimate provided, no adjustments → no edge detectable
    baseRate = marketPrice;
    estimatedProb = marketPrice;
  }

  // Step 2: Compute edge
  const edgePct = (estimatedProb - marketPrice) * 100;

  // Step 3: EV calculation (use $100 reference stake)
  const ev = expectedValue(100, marketPrice, estimatedProb);

  // Step 4: Kelly sizing
  const kelly = kellyFraction(marketPrice, estimatedProb, bankroll, maxFraction);

  // Step 5: Market efficiency
  const efficiency = analyzeEfficiency([market.currentPrices.yes, market.currentPrices.no]);

  // Step 6: Liquidity
  const liq = liquidityScore(market.volumeUsd, market.liquidityUsd);

  // Step 7: Time analysis
  const days = daysToClose(market.closeDate);
  const tdScore = timeDecayScore(days, marketPrice);
  const nearCertain = isNearCertainExpiry(days, marketPrice);

  // Step 8: Classify edge type
  const edgeType = classifyEdge(edgePct, nearCertain, liq.rating);

  // Step 9: Score (0-100)
  const timeDecayBonus = nearCertain ? 20 : 0;
  const score = Math.min(100, Math.round(
    Math.abs(edgePct) * 3 + liq.score * 0.2 + timeDecayBonus,
  ));

  // Step 10: Verdict
  const verdict = determineVerdict(edgePct);

  // Step 11: Build risks
  const risks = buildRisks(days, liq.rating, efficiency.isEfficient, marketPrice);

  // Step 12: Invalidation
  const invalidation = buildInvalidation(edgeType, edgePct, marketPrice);

  // Build evidence
  const evidence = {
    baseRate,
    adjustments,
    estimatedProbability: estimatedProb,
    marketPrice,
    ev,
    kelly,
    efficiency,
    liquidity: liq,
    daysToClose: days,
    timeDecayScore: tdScore,
    isNearCertainExpiry: nearCertain,
  };

  return {
    schemaVersion: '1.0',
    market: {
      platform: market.platform,
      externalId: market.externalId,
      title: market.title,
      url: market.url,
    },
    verdict,
    score,
    calibration: { isProbability: true },
    edge: {
      type: edgeType,
      pct: Math.round(edgePct * 100) / 100,
      description: describeEdge(edgeType, edgePct),
    },
    evidence,
    sizing: {
      recommended: kelly.recommended,
      positionSize: kelly.positionSize,
      fullKelly: kelly.fullKelly,
      halfKelly: kelly.halfKelly,
    },
    risks,
    invalidation,
    provenance: {
      platform: market.platform,
      evaluatedAt: new Date().toISOString(),
      rulesetVersion: RULESET_VERSION,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classifyEdge(edgePct: number, nearCertain: boolean, liquidityRating: string): EdgeType {
  if (nearCertain) return 'time_decay';
  if (liquidityRating === 'low' && Math.abs(edgePct) > 5) return 'liquidity_premium';
  if (Math.abs(edgePct) >= 5) return 'base_rate_deviation';
  return 'none';
}

function determineVerdict(edgePct: number): MarketVerdict {
  if (edgePct >= 5) return 'BUY_YES';
  if (edgePct <= -5) return 'BUY_NO';
  return 'SKIP';
}

function buildRisks(days: number, liquidityRating: string, isEfficient: boolean, marketPrice: number): string[] {
  const risks: string[] = [];
  if (days <= 3) risks.push('Market closes within 3 days — limited time to exit');
  if (days === 0) risks.push('Market already expired');
  if (liquidityRating === 'low') risks.push('Low liquidity — may face slippage');
  if (!isEfficient) risks.push('Market has high overround — vig may eat edge');
  if (marketPrice > 0.95 || marketPrice < 0.05) risks.push('Extreme price — binary payout risk');
  return risks;
}

function buildInvalidation(edgeType: EdgeType, edgePct: number, marketPrice: number): string {
  if (edgeType === 'time_decay') {
    return `Edge invalidated if YES price drops below ${Math.round((marketPrice - 0.05) * 100)}¢`;
  }
  if (edgeType === 'base_rate_deviation') {
    const threshold = Math.round((marketPrice + (edgePct > 0 ? 0.05 : -0.05)) * 100);
    return `Edge invalidated if market price moves to ${threshold}¢ (edge absorbed)`;
  }
  return 'No edge detected — no invalidation criteria';
}

function describeEdge(edgeType: EdgeType, edgePct: number): string {
  const dir = edgePct > 0 ? 'underpriced' : 'overpriced';
  switch (edgeType) {
    case 'base_rate_deviation':
      return `Market is ${dir} by ${Math.abs(edgePct).toFixed(1)}% based on probability estimate`;
    case 'time_decay':
      return 'Near-certain expiry — bond-like return opportunity';
    case 'liquidity_premium':
      return `Thin market ${dir} by ${Math.abs(edgePct).toFixed(1)}% — liquidity premium capture`;
    case 'cross_platform_arb':
      return `Cross-platform price discrepancy of ${Math.abs(edgePct).toFixed(1)}%`;
    case 'correlation_lag':
      return `Related market resolved but this hasn't adjusted — ${Math.abs(edgePct).toFixed(1)}% lag`;
    case 'information_asymmetry':
      return `Information edge of ${Math.abs(edgePct).toFixed(1)}%`;
    default:
      return 'No significant edge detected';
  }
}
