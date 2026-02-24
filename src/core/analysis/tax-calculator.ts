import type { Transaction, CostBasisLot, TaxEvent } from '../types/database.js';
import type { CostBasisMethod, GainType, TaxJurisdiction, TxType } from '../types/common.js';
import { calculateCostBasis, classifyGainType, getHoldingPeriod } from './cost-basis-calculator.js';
import { isInTaxYear } from '../utils/date.js';

/** Types that trigger a taxable disposal */
const DISPOSAL_TYPES: Set<TxType> = new Set([
  'sell',
  'swap',
  'transfer_out',
  'gift_sent',
  'burn',
  'lost',
  'stolen',
]);

/** Types that are treated as income */
const INCOME_TYPES: Set<TxType> = new Set([
  'airdrop',
  'income',
  'claim',
  'mint',
]);

export interface IncomeEvent {
  txId: string;
  incomeType: string;
  tokenSymbol: string;
  amount: number;
  valueUsd: number;
  timestamp: string;
}

export interface TaxEventInput {
  tenant_id: string;
  tx_id: string;
  event_type: 'capital_gain' | 'capital_loss' | 'income' | 'expense';
  gain_type: GainType | null;
  proceeds_usd: number;
  cost_basis_usd: number;
  gain_loss_usd: number;
  holding_period_days: number | null;
  method: CostBasisMethod;
  tax_year: number;
}

/**
 * Calculate all taxable events from a set of transactions and lots.
 */
export function calculateTaxableEvents(
  transactions: Transaction[],
  lots: CostBasisLot[],
  method: CostBasisMethod,
  jurisdiction: TaxJurisdiction = 'us',
): TaxEventInput[] {
  const events: TaxEventInput[] = [];

  // Build a mutable copy of lots so we can track remaining
  const mutableLots = lots.map((l) => ({ ...l }));

  // Process disposals
  for (const tx of transactions) {
    if (!DISPOSAL_TYPES.has(tx.tx_type)) continue;

    // Get lots for this token
    const tokenLots = mutableLots.filter(
      (l) => l.token_symbol === tx.token_symbol && l.remaining_amount > 0,
    );

    const result = calculateCostBasis(tokenLots, tx.amount, tx.value_usd, method);

    // Update the mutable lots
    for (const consumed of result.lots_consumed) {
      const lot = mutableLots.find((l) => l.id === consumed.lotId);
      if (lot) {
        lot.remaining_amount -= consumed.amountUsed;
        if (lot.remaining_amount <= 0) lot.is_consumed = true;
      }
    }

    // Determine holding period from the earliest lot consumed
    let holdingDays: number | null = null;
    let gainType: GainType | null = null;
    if (result.lots_consumed.length > 0) {
      const earliest = result.lots_consumed[0]!;
      holdingDays = getHoldingPeriod(earliest.acquiredAt, tx.timestamp);
      gainType = classifyGainType(holdingDays, jurisdiction);
    }

    const eventType = result.gain_loss >= 0 ? 'capital_gain' : 'capital_loss';
    const txYear = new Date(tx.timestamp).getFullYear();

    events.push({
      tenant_id: tx.tenant_id,
      tx_id: tx.id,
      event_type: eventType,
      gain_type: gainType,
      proceeds_usd: result.proceeds,
      cost_basis_usd: result.cost_basis,
      gain_loss_usd: result.gain_loss,
      holding_period_days: holdingDays,
      method,
      tax_year: txYear,
    });
  }

  return events;
}

/**
 * Calculate income events from transactions that represent income.
 */
export function calculateIncome(transactions: Transaction[]): IncomeEvent[] {
  return transactions
    .filter((tx) => INCOME_TYPES.has(tx.tx_type))
    .map((tx) => ({
      txId: tx.id,
      incomeType: tx.tx_type,
      tokenSymbol: tx.token_symbol,
      amount: tx.amount,
      valueUsd: tx.value_usd,
      timestamp: tx.timestamp,
    }));
}

export interface YearSummary {
  tax_year: number;
  total_proceeds: number;
  total_cost_basis: number;
  short_term_gains: number;
  long_term_gains: number;
  total_income: number;
  total_losses: number;
}

/**
 * Aggregate tax events and income by year.
 */
export function aggregateByYear(
  events: TaxEventInput[],
  income: IncomeEvent[],
): Map<number, YearSummary> {
  const map = new Map<number, YearSummary>();

  const getOrCreate = (year: number): YearSummary => {
    let s = map.get(year);
    if (!s) {
      s = {
        tax_year: year,
        total_proceeds: 0,
        total_cost_basis: 0,
        short_term_gains: 0,
        long_term_gains: 0,
        total_income: 0,
        total_losses: 0,
      };
      map.set(year, s);
    }
    return s;
  };

  for (const ev of events) {
    const s = getOrCreate(ev.tax_year);
    s.total_proceeds += ev.proceeds_usd;
    s.total_cost_basis += ev.cost_basis_usd;

    if (ev.gain_loss_usd >= 0) {
      if (ev.gain_type === 'long_term') {
        s.long_term_gains += ev.gain_loss_usd;
      } else {
        s.short_term_gains += ev.gain_loss_usd;
      }
    } else {
      s.total_losses += Math.abs(ev.gain_loss_usd);
    }
  }

  for (const inc of income) {
    const year = new Date(inc.timestamp).getFullYear();
    const s = getOrCreate(year);
    s.total_income += inc.valueUsd;
  }

  return map;
}

/** US federal tax brackets (2024, simplified) */
interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

const US_SHORT_TERM_BRACKETS: TaxBracket[] = [
  { min: 0, max: 11600, rate: 0.10 },
  { min: 11600, max: 47150, rate: 0.12 },
  { min: 47150, max: 100525, rate: 0.22 },
  { min: 100525, max: 191950, rate: 0.24 },
  { min: 191950, max: 243725, rate: 0.32 },
  { min: 243725, max: 609350, rate: 0.35 },
  { min: 609350, max: Infinity, rate: 0.37 },
];

const US_LONG_TERM_RATE = 0.15; // Simplified — middle bracket

/**
 * Estimate total tax liability for a given summary and jurisdiction.
 */
export function estimateTax(summary: YearSummary, jurisdiction: TaxJurisdiction = 'us'): number {
  switch (jurisdiction) {
    case 'us':
      return estimateUsTax(summary);
    case 'uk':
      return estimateSimpleTax(summary, 0.20); // 20% basic rate CGT
    case 'ca':
      return estimateSimpleTax(summary, 0.25); // 50% inclusion at ~50% marginal
    case 'au':
      return estimateSimpleTax(summary, 0.325); // middle bracket
    case 'de':
      return estimateSimpleTax(summary, 0); // >1yr = 0, <1yr taxed — simplified
    case 'fr':
      return estimateSimpleTax(summary, 0.30); // flat 30% PFU
    case 'jp':
      return estimateSimpleTax(summary, 0.55); // highest bracket for misc income
    case 'sg':
    case 'ae':
      return 0; // No capital gains tax
    default:
      return estimateSimpleTax(summary, 0.25);
  }
}

function estimateUsTax(summary: YearSummary): number {
  // Short-term gains taxed as ordinary income
  let stTax = 0;
  let remaining = Math.max(summary.short_term_gains - summary.total_losses, 0);
  for (const bracket of US_SHORT_TERM_BRACKETS) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, bracket.max - bracket.min);
    stTax += taxable * bracket.rate;
    remaining -= taxable;
  }

  // Long-term gains at flat rate (simplified)
  const ltTax = summary.long_term_gains * US_LONG_TERM_RATE;

  // Income taxed similarly to short-term
  let incTax = 0;
  remaining = summary.total_income;
  for (const bracket of US_SHORT_TERM_BRACKETS) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, bracket.max - bracket.min);
    incTax += taxable * bracket.rate;
    remaining -= taxable;
  }

  return stTax + ltTax + incTax;
}

function estimateSimpleTax(summary: YearSummary, rate: number): number {
  const netGains =
    summary.short_term_gains + summary.long_term_gains - summary.total_losses;
  const totalTaxable = Math.max(netGains, 0) + summary.total_income;
  return totalTaxable * rate;
}
