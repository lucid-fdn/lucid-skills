export const CHAINS = [
  'ethereum',
  'solana',
  'bsc',
  'arbitrum',
  'base',
  'polygon',
  'avalanche',
  'bitcoin',
] as const;
export type Chain = (typeof CHAINS)[number];

export const TX_TYPES = [
  'buy',
  'sell',
  'swap',
  'transfer_in',
  'transfer_out',
  'stake',
  'unstake',
  'claim',
  'mint',
  'burn',
  'bridge',
  'airdrop',
  'income',
  'gift_received',
  'gift_sent',
  'lost',
  'stolen',
] as const;
export type TxType = (typeof TX_TYPES)[number];

export const COST_BASIS_METHODS = ['fifo', 'lifo', 'hifo', 'acb', 'specific_id'] as const;
export type CostBasisMethod = (typeof COST_BASIS_METHODS)[number];

export const TAX_JURISDICTIONS = ['us', 'uk', 'ca', 'au', 'de', 'fr', 'jp', 'sg', 'ae'] as const;
export type TaxJurisdiction = (typeof TAX_JURISDICTIONS)[number];

export const GAIN_TYPES = ['short_term', 'long_term'] as const;
export type GainType = (typeof GAIN_TYPES)[number];

export const REPORT_FORMATS = ['summary', 'detailed', 'form_8949', 'schedule_d', 'csv'] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export const INCOME_TYPES = [
  'mining',
  'staking',
  'airdrop',
  'defi_yield',
  'salary',
  'bounty',
  'referral',
] as const;
export type IncomeType = (typeof INCOME_TYPES)[number];
