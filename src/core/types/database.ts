import type { Chain, CostBasisMethod, GainType, TxType } from './common.js';

/** Tracked wallet */
export interface TaxWallet {
  id: string;
  tenant_id: string;
  address: string;
  chain: Chain;
  label: string | null;
  imported_at: string;
}

/** A single on-chain transaction */
export interface Transaction {
  id: string;
  tenant_id: string;
  wallet_id: string;
  tx_hash: string;
  chain: Chain;
  tx_type: TxType;
  from_address: string;
  to_address: string;
  token_address: string | null;
  token_symbol: string;
  amount: number;
  price_usd: number;
  value_usd: number;
  fee_usd: number;
  fee_token: string | null;
  timestamp: string;
  is_classified: boolean;
  classification_notes: string | null;
  created_at: string;
}

/** A cost-basis lot (tax lot) */
export interface CostBasisLot {
  id: string;
  tenant_id: string;
  token_symbol: string;
  chain: Chain;
  amount: number;
  cost_per_unit_usd: number;
  total_cost_usd: number;
  acquired_at: string;
  acquired_via: TxType;
  remaining_amount: number;
  is_consumed: boolean;
}

/** A taxable event resulting from a disposal or income */
export interface TaxEvent {
  id: string;
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
  created_at: string;
}

/** Aggregated tax summary for a year/jurisdiction */
export interface TaxSummary {
  id: string;
  tenant_id: string;
  tax_year: number;
  jurisdiction: string;
  total_proceeds: number;
  total_cost_basis: number;
  short_term_gains: number;
  long_term_gains: number;
  total_income: number;
  total_losses: number;
  estimated_tax: number;
  created_at: string;
}

/** Historical token price */
export interface PriceHistory {
  id: string;
  token_symbol: string;
  date: string;
  price_usd: number;
  source: string;
}

/** Insert helpers — omit server-generated fields */
export type TaxWalletInsert = Omit<TaxWallet, 'id' | 'imported_at'>;
export type TransactionInsert = Omit<Transaction, 'id' | 'created_at'>;
export type CostBasisLotInsert = Omit<CostBasisLot, 'id'>;
export type TaxEventInsert = Omit<TaxEvent, 'id' | 'created_at'>;
export type TaxSummaryInsert = Omit<TaxSummary, 'id' | 'created_at'>;
export type PriceHistoryInsert = Omit<PriceHistory, 'id'>;
