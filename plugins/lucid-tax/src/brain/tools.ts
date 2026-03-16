// ---------------------------------------------------------------------------
// brain/tools.ts -- 5 brain MCP tools for Lucid Tax
// ---------------------------------------------------------------------------

import { z } from 'zod';
import type { ToolDefinition } from '../core/tools/types.js';
import { ok, err } from '../core/tools/types.js';
import type { PluginConfig } from '../core/types/config.js';
import type { CostBasisMethod, TaxJurisdiction } from '../core/types/common.js';
import { COST_BASIS_METHODS, TAX_JURISDICTIONS } from '../core/types/common.js';
import { getSupabaseClient } from '../core/db/client.js';
import * as txDb from '../core/db/transactions.js';
import * as cbDb from '../core/db/cost-basis.js';
import * as walletsDb from '../core/db/wallets.js';
import * as eventsDb from '../core/db/tax-events.js';
import {
  runTaxAnalysis,
  runMethodComparison,
  runHarvestingAnalysis,
  runWalletHealth,
} from './analysis.js';
import {
  formatTaxAnalysis,
  formatMethodComparison,
  formatHarvestingResult,
  formatWalletHealth,
} from './formatter.js';
import {
  calculateTaxableEvents,
  calculateIncome,
  aggregateByYear,
  estimateTax,
} from '../core/analysis/tax-calculator.js';
import {
  buildPositions,
  findHarvestingOpportunities,
  calculateWashSaleRisk,
  estimateTaxSavings,
} from '../core/analysis/tax-loss-harvester.js';
import { calculateCostBasis, classifyGainType, getHoldingPeriod } from '../core/analysis/cost-basis-calculator.js';
import { logger } from '../core/utils/logger.js';
import { getErrorMessage } from '../core/utils/errors.js';

const OUTPUT_FORMATS = ['json', 'text'] as const;

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface BrainDeps {
  config: PluginConfig;
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

export function createBrainTools(deps: BrainDeps): ToolDefinition[] {
  const { config } = deps;
  const db = getSupabaseClient(config);
  const tenantId = config.tenantId;

  // -----------------------------------------------------------------------
  // 1. lucid_tax_analyze — Full tax analysis for a year
  // -----------------------------------------------------------------------
  const analyze: ToolDefinition = {
    name: 'lucid_tax_analyze',
    description:
      'Full tax analysis for a year. Combines gains calculation, method comparison, and optimization recommendations into a structured verdict (OPTIMIZE / COMPLIANT / ACTION_NEEDED / AUDIT_RISK).',
    inputSchema: z.object({
      tax_year: z.number().int().optional().describe('Tax year (default: current year)'),
      jurisdiction: z.enum(TAX_JURISDICTIONS).optional().describe('Tax jurisdiction (default: from config)'),
      method: z.enum(COST_BASIS_METHODS).optional().describe('Cost basis method (default: from config)'),
      format: z.enum(OUTPUT_FORMATS).optional().describe('Output format: json (default) or text'),
    }),
    handler: async (raw) => {
      const args = analyze.inputSchema.parse(raw) as {
        tax_year?: number;
        jurisdiction?: TaxJurisdiction;
        method?: CostBasisMethod;
        format?: 'json' | 'text';
      };
      try {
        const year = args.tax_year ?? config.taxYear;
        const jurisdiction = args.jurisdiction ?? config.defaultJurisdiction;
        const method = args.method ?? config.defaultCostBasisMethod;
        const format = args.format ?? 'json';

        const txns = await txDb.getTransactionsByTenant(db, tenantId, year);
        const lots = await cbDb.getAllLotsByTenant(db, tenantId);
        const wallets = await walletsDb.getWalletsByTenant(db, tenantId);

        if (txns.length === 0 && lots.length === 0) {
          return ok(`No data found for tax year ${year}. Import wallets first.`);
        }

        const result = runTaxAnalysis({
          transactions: txns,
          lots,
          taxYear: year,
          jurisdiction,
          method,
          walletCount: wallets.length,
        });

        if (format === 'text') return ok(formatTaxAnalysis(result));
        return ok(JSON.stringify(result, null, 2));
      } catch (e) {
        return err(`Tax analysis failed: ${getErrorMessage(e)}`);
      }
    },
  };

  // -----------------------------------------------------------------------
  // 2. lucid_tax_optimize — Compare all cost basis methods
  // -----------------------------------------------------------------------
  const optimize: ToolDefinition = {
    name: 'lucid_tax_optimize',
    description:
      'Compare all cost basis methods (FIFO, LIFO, HIFO, ACB) to find the one that minimizes tax for a given year.',
    inputSchema: z.object({
      tax_year: z.number().int().optional().describe('Tax year (default: current year)'),
      jurisdiction: z.enum(TAX_JURISDICTIONS).optional().describe('Tax jurisdiction (default: from config)'),
      format: z.enum(OUTPUT_FORMATS).optional().describe('Output format: json (default) or text'),
    }),
    handler: async (raw) => {
      const args = optimize.inputSchema.parse(raw) as {
        tax_year?: number;
        jurisdiction?: TaxJurisdiction;
        format?: 'json' | 'text';
      };
      try {
        const year = args.tax_year ?? config.taxYear;
        const jurisdiction = args.jurisdiction ?? config.defaultJurisdiction;
        const format = args.format ?? 'json';

        const txns = await txDb.getTransactionsByTenant(db, tenantId, year);
        const lots = await cbDb.getAllLotsByTenant(db, tenantId);

        if (txns.length === 0) {
          return ok(`No transactions found for ${year}.`);
        }

        const result = runMethodComparison({
          transactions: txns,
          lots,
          taxYear: year,
          jurisdiction,
        });

        if (format === 'text') return ok(formatMethodComparison(result));
        return ok(JSON.stringify(result, null, 2));
      } catch (e) {
        return err(`Optimization analysis failed: ${getErrorMessage(e)}`);
      }
    },
  };

  // -----------------------------------------------------------------------
  // 3. lucid_tax_harvest — Tax-loss harvesting with wash sale detection
  // -----------------------------------------------------------------------
  const harvest: ToolDefinition = {
    name: 'lucid_tax_harvest',
    description:
      'Find tax-loss harvesting opportunities with wash sale detection. Identifies tokens trading below cost basis and estimates potential tax savings.',
    inputSchema: z.object({
      min_loss_usd: z.number().optional().describe('Minimum unrealized loss in USD to include (default: 0)'),
      tax_rate: z.number().optional().describe('Marginal tax rate for savings estimate (default: 0.35)'),
      format: z.enum(OUTPUT_FORMATS).optional().describe('Output format: json (default) or text'),
    }),
    handler: async (raw) => {
      const args = harvest.inputSchema.parse(raw) as {
        min_loss_usd?: number;
        tax_rate?: number;
        format?: 'json' | 'text';
      };
      try {
        const minLoss = args.min_loss_usd ?? 0;
        const taxRate = args.tax_rate ?? 0.35;
        const format = args.format ?? 'json';

        const lots = await cbDb.getAllLotsByTenant(db, tenantId);
        const txns = await txDb.getTransactionsByTenant(db, tenantId);

        if (lots.length === 0) {
          return ok('No cost basis lots found. Import wallets and calculate gains first.');
        }

        // Note: In production, current prices would come from a price provider.
        // For now, return position analysis with a note about price data.
        const positions = buildPositions(lots);
        if (positions.length === 0) {
          return ok('No active holdings found.');
        }

        // If we have price data in transactions, use latest known prices as approximation
        const currentPrices: Record<string, number> = {};
        for (const tx of txns) {
          if (tx.price_usd > 0) {
            // Use the most recent price for each token
            currentPrices[tx.token_symbol] = tx.price_usd;
          }
        }

        if (Object.keys(currentPrices).length === 0) {
          return ok(
            `${positions.length} holdings found, but no price data available.\n` +
            'Configure a price provider API key for live harvesting analysis.',
          );
        }

        const result = runHarvestingAnalysis({
          lots,
          transactions: txns,
          currentPrices,
          minLossUsd: minLoss,
          taxRate,
        });

        if (format === 'text') return ok(formatHarvestingResult(result));
        return ok(JSON.stringify(result, null, 2));
      } catch (e) {
        return err(`Harvesting analysis failed: ${getErrorMessage(e)}`);
      }
    },
  };

  // -----------------------------------------------------------------------
  // 4. lucid_tax_health — Wallet and data health check
  // -----------------------------------------------------------------------
  const health: ToolDefinition = {
    name: 'lucid_tax_health',
    description:
      'Wallet and data health check. Identifies unclassified transactions, missing price data, high-value items needing review, and provides a health score.',
    inputSchema: z.object({
      format: z.enum(OUTPUT_FORMATS).optional().describe('Output format: json (default) or text'),
    }),
    handler: async (raw) => {
      const args = health.inputSchema.parse(raw) as { format?: 'json' | 'text' };
      try {
        const format = args.format ?? 'json';

        const txns = await txDb.getTransactionsByTenant(db, tenantId);
        const wallets = await walletsDb.getWalletsByTenant(db, tenantId);

        const result = runWalletHealth({
          transactions: txns,
          walletCount: wallets.length,
        });

        if (format === 'text') return ok(formatWalletHealth(result));
        return ok(JSON.stringify(result, null, 2));
      } catch (e) {
        return err(`Health check failed: ${getErrorMessage(e)}`);
      }
    },
  };

  // -----------------------------------------------------------------------
  // 5. lucid_tax_pro — Direct access to tax functions
  // -----------------------------------------------------------------------
  const pro: ToolDefinition = {
    name: 'lucid_tax_pro',
    description:
      'Direct access to individual tax computation functions. Use tool="list_tools" to see available tools, or specify a tool name and params.',
    inputSchema: z.object({
      tool: z.string().describe('Tool name to execute, or "list_tools" to list available tools'),
      params: z.record(z.string(), z.unknown()).optional().describe('Parameters for the selected tool'),
    }),
    handler: async (raw) => {
      const args = pro.inputSchema.parse(raw) as {
        tool: string;
        params?: Record<string, unknown>;
      };
      try {
        const toolName = args.tool;
        const toolParams = args.params ?? {};

        if (toolName === 'list_tools') {
          return ok(JSON.stringify({
            tools: [
              { name: 'calculate_taxable_events', description: 'Calculate taxable events from transactions and lots' },
              { name: 'calculate_income', description: 'Extract income events from transactions' },
              { name: 'aggregate_by_year', description: 'Aggregate tax events and income by year' },
              { name: 'estimate_tax', description: 'Estimate tax for a year summary and jurisdiction' },
              { name: 'build_positions', description: 'Build holding positions from cost basis lots' },
              { name: 'find_harvesting', description: 'Find harvesting opportunities from positions and prices' },
              { name: 'wash_sale_risk', description: 'Check wash sale risk for a token' },
              { name: 'calculate_cost_basis', description: 'Calculate cost basis for a disposal' },
              { name: 'classify_gain_type', description: 'Classify gain as short-term or long-term' },
              { name: 'holding_period', description: 'Get holding period in days between two dates' },
            ],
          }, null, 2));
        }

        /* eslint-disable @typescript-eslint/no-explicit-any */
        const proTools: Record<string, (p: any) => unknown | Promise<unknown>> = {
          calculate_taxable_events: async (p) => {
            const txns = await txDb.getTransactionsByTenant(db, tenantId, p.tax_year);
            const lots = await cbDb.getAllLotsByTenant(db, tenantId);
            const method = (p.method as CostBasisMethod) ?? config.defaultCostBasisMethod;
            const jurisdiction = (p.jurisdiction as TaxJurisdiction) ?? config.defaultJurisdiction;
            return calculateTaxableEvents(txns, lots, method, jurisdiction);
          },
          calculate_income: async (p) => {
            const txns = await txDb.getTransactionsByTenant(db, tenantId, p.tax_year);
            return calculateIncome(txns);
          },
          aggregate_by_year: async (p) => {
            const txns = await txDb.getTransactionsByTenant(db, tenantId, p.tax_year);
            const lots = await cbDb.getAllLotsByTenant(db, tenantId);
            const method = (p.method as CostBasisMethod) ?? config.defaultCostBasisMethod;
            const jurisdiction = (p.jurisdiction as TaxJurisdiction) ?? config.defaultJurisdiction;
            const events = calculateTaxableEvents(txns, lots, method, jurisdiction);
            const income = calculateIncome(txns);
            const map = aggregateByYear(events, income);
            return Object.fromEntries(map);
          },
          estimate_tax: (p) => {
            const summary = p.summary as any;
            const jurisdiction = (p.jurisdiction as TaxJurisdiction) ?? config.defaultJurisdiction;
            return estimateTax(summary, jurisdiction);
          },
          build_positions: async () => {
            const lots = await cbDb.getAllLotsByTenant(db, tenantId);
            return buildPositions(lots);
          },
          find_harvesting: async (p) => {
            const lots = await cbDb.getAllLotsByTenant(db, tenantId);
            const positions = buildPositions(lots);
            const prices = (p.current_prices as Record<string, number>) ?? {};
            const minLoss = (p.min_loss_usd as number) ?? 0;
            return findHarvestingOpportunities(positions, prices, minLoss);
          },
          wash_sale_risk: async (p) => {
            const txns = await txDb.getTransactionsByTenant(db, tenantId);
            const token = p.token as string;
            return { token, washSaleRisk: calculateWashSaleRisk(txns, token) };
          },
          calculate_cost_basis: async (p) => {
            const lots = await cbDb.getAvailableLots(db, tenantId, p.token as string);
            const method = (p.method as CostBasisMethod) ?? config.defaultCostBasisMethod;
            return calculateCostBasis(lots, p.amount as number, p.proceeds as number, method);
          },
          classify_gain_type: (p) => {
            const jurisdiction = (p.jurisdiction as TaxJurisdiction) ?? config.defaultJurisdiction;
            return classifyGainType(p.holding_days as number, jurisdiction);
          },
          holding_period: (p) => {
            return getHoldingPeriod(p.acquired_at as string, p.disposed_at as string);
          },
        };
        /* eslint-enable @typescript-eslint/no-explicit-any */

        const fn = proTools[toolName];
        if (!fn) {
          return err(`Tool "${toolName}" not found. Use list_tools to see available tools.`);
        }

        const result = await fn(toolParams);
        return ok(JSON.stringify(result, null, 2));
      } catch (e) {
        return err(`Pro tool failed: ${getErrorMessage(e)}`);
      }
    },
  };

  return [analyze, optimize, harvest, health, pro];
}
