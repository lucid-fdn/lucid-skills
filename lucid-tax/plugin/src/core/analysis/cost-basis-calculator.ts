import type { CostBasisLot } from '../types/database.js';
import type { CostBasisMethod, GainType, TaxJurisdiction } from '../types/common.js';
import { daysBetween } from '../utils/date.js';

export interface LotConsumption {
  lotId: string;
  amountUsed: number;
  costBasis: number;
  acquiredAt: string;
}

export interface CostBasisResult {
  lots_consumed: LotConsumption[];
  cost_basis: number;
  proceeds: number;
  gain_loss: number;
}

/**
 * Sort lots for FIFO: oldest first.
 */
function sortFifo(lots: CostBasisLot[]): CostBasisLot[] {
  return [...lots].sort(
    (a, b) => new Date(a.acquired_at).getTime() - new Date(b.acquired_at).getTime(),
  );
}

/**
 * Sort lots for LIFO: newest first.
 */
function sortLifo(lots: CostBasisLot[]): CostBasisLot[] {
  return [...lots].sort(
    (a, b) => new Date(b.acquired_at).getTime() - new Date(a.acquired_at).getTime(),
  );
}

/**
 * Sort lots for HIFO: highest cost per unit first.
 */
function sortHifo(lots: CostBasisLot[]): CostBasisLot[] {
  return [...lots].sort((a, b) => b.cost_per_unit_usd - a.cost_per_unit_usd);
}

/**
 * Consume lots in the given order to cover saleAmount.
 */
function consumeLots(
  sortedLots: CostBasisLot[],
  saleAmount: number,
): LotConsumption[] {
  const consumed: LotConsumption[] = [];
  let remaining = saleAmount;

  for (const lot of sortedLots) {
    if (remaining <= 0) break;
    if (lot.remaining_amount <= 0) continue;

    const used = Math.min(lot.remaining_amount, remaining);
    const costBasis = used * lot.cost_per_unit_usd;

    consumed.push({
      lotId: lot.id,
      amountUsed: used,
      costBasis,
      acquiredAt: lot.acquired_at,
    });

    remaining -= used;
  }

  return consumed;
}

/**
 * Calculate cost basis using FIFO (First In, First Out).
 */
export function calculateFifo(lots: CostBasisLot[], saleAmount: number): LotConsumption[] {
  return consumeLots(sortFifo(lots), saleAmount);
}

/**
 * Calculate cost basis using LIFO (Last In, First Out).
 */
export function calculateLifo(lots: CostBasisLot[], saleAmount: number): LotConsumption[] {
  return consumeLots(sortLifo(lots), saleAmount);
}

/**
 * Calculate cost basis using HIFO (Highest In, First Out).
 */
export function calculateHifo(lots: CostBasisLot[], saleAmount: number): LotConsumption[] {
  return consumeLots(sortHifo(lots), saleAmount);
}

/**
 * Calculate cost basis using ACB (Adjusted Cost Base / Average Cost).
 */
export function calculateAcb(lots: CostBasisLot[], saleAmount: number): LotConsumption[] {
  const availableLots = lots.filter((l) => l.remaining_amount > 0);
  if (availableLots.length === 0) return [];

  const totalAmount = availableLots.reduce((sum, l) => sum + l.remaining_amount, 0);
  const totalCost = availableLots.reduce(
    (sum, l) => sum + l.remaining_amount * l.cost_per_unit_usd,
    0,
  );
  const avgCostPerUnit = totalAmount > 0 ? totalCost / totalAmount : 0;

  // For ACB, we create a single synthetic consumption based on the average cost
  const effectiveAmount = Math.min(saleAmount, totalAmount);
  if (effectiveAmount <= 0) return [];

  // Still consume from lots (FIFO order) but apply average cost
  const sorted = sortFifo(availableLots);
  const consumed: LotConsumption[] = [];
  let remaining = effectiveAmount;

  for (const lot of sorted) {
    if (remaining <= 0) break;
    const used = Math.min(lot.remaining_amount, remaining);
    consumed.push({
      lotId: lot.id,
      amountUsed: used,
      costBasis: used * avgCostPerUnit,
      acquiredAt: lot.acquired_at,
    });
    remaining -= used;
  }

  return consumed;
}

/**
 * Calculate cost basis for a sale using the specified method.
 */
export function calculateCostBasis(
  lots: CostBasisLot[],
  saleAmount: number,
  proceeds: number,
  method: CostBasisMethod,
): CostBasisResult {
  let consumed: LotConsumption[];

  switch (method) {
    case 'fifo':
      consumed = calculateFifo(lots, saleAmount);
      break;
    case 'lifo':
      consumed = calculateLifo(lots, saleAmount);
      break;
    case 'hifo':
      consumed = calculateHifo(lots, saleAmount);
      break;
    case 'acb':
      consumed = calculateAcb(lots, saleAmount);
      break;
    case 'specific_id':
      // Default to FIFO for specific_id unless user specifies
      consumed = calculateFifo(lots, saleAmount);
      break;
  }

  const costBasis = consumed.reduce((sum, c) => sum + c.costBasis, 0);
  const gainLoss = proceeds - costBasis;

  return {
    lots_consumed: consumed,
    cost_basis: costBasis,
    proceeds,
    gain_loss: gainLoss,
  };
}

/**
 * Get holding period in days.
 */
export function getHoldingPeriod(acquiredAt: string | Date, disposedAt: string | Date): number {
  return daysBetween(acquiredAt, disposedAt);
}

/**
 * Classify gain type based on holding period and jurisdiction.
 */
export function classifyGainType(
  holdingDays: number,
  jurisdiction: TaxJurisdiction = 'us',
): GainType {
  // Jurisdiction-specific long-term thresholds (in days)
  const longTermThresholds: Record<TaxJurisdiction, number> = {
    us: 365, // > 1 year
    uk: 0, // UK doesn't distinguish (use short_term)
    ca: 0, // Canada doesn't distinguish but has 50% inclusion
    au: 365, // > 12 months for CGT discount
    de: 365, // > 1 year = tax free
    fr: 0, // France doesn't distinguish
    jp: 0, // Japan taxes all as misc income
    sg: 0, // Singapore generally no capital gains tax
    ae: 0, // UAE no capital gains tax
  };

  const threshold = longTermThresholds[jurisdiction];
  if (threshold === 0) return 'short_term';
  return holdingDays > threshold ? 'long_term' : 'short_term';
}
