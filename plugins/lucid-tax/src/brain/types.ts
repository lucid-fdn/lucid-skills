// ---------------------------------------------------------------------------
// brain/types.ts -- Brain result types for Lucid Tax
// ---------------------------------------------------------------------------

export type TaxVerdict = 'OPTIMIZE' | 'COMPLIANT' | 'ACTION_NEEDED' | 'AUDIT_RISK';

export interface TaxAnalysisResult {
  schemaVersion: 1;
  taxYear: number;
  jurisdiction: string;
  verdict: TaxVerdict;
  summary: {
    totalProceeds: number;
    totalCostBasis: number;
    shortTermGains: number;
    longTermGains: number;
    totalIncome: number;
    totalLosses: number;
    estimatedTax: number;
    effectiveRate: number; // estimatedTax / (gains + income)
  };
  optimization: {
    currentMethod: string;
    bestMethod: string;
    potentialSavings: number; // tax difference between current and best method
    harvestingOpportunities: number;
    estimatedHarvestSavings: number;
  };
  riskFactors: string[];
  recommendations: string[];
  provenance: { tool: string; version: string; timestamp: string };
}

export interface MethodComparisonResult {
  taxYear: number;
  methods: Array<{
    method: string;
    shortTermGains: number;
    longTermGains: number;
    totalLosses: number;
    estimatedTax: number;
  }>;
  bestMethod: string;
  worstMethod: string;
  maxSavings: number;
}

export interface HarvestingResult {
  opportunities: Array<{
    token: string;
    unrealizedLoss: number;
    lossPercentage: number;
    washSaleRisk: boolean;
    estimatedTaxSavings: number;
  }>;
  totalPotentialSavings: number;
  washSaleWarnings: number;
}

export interface WalletHealthResult {
  walletCount: number;
  transactionCount: number;
  unclassifiedCount: number;
  missingPriceCount: number;
  highValueTransactions: number;
  classificationRate: number; // percent classified
  healthScore: number; // 0-100
  issues: string[];
}
