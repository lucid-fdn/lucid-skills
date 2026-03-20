import { z } from 'zod';
import type { ToolDefinition } from './types.js';
import { ok, err } from './types.js';
import type { PluginConfig } from '../types/config.js';
import {
  CHAINS,
  COST_BASIS_METHODS,
  TAX_JURISDICTIONS,
  REPORT_FORMATS,
  TX_TYPES,
} from '../types/common.js';
import type {
  Chain,
  CostBasisMethod,
  TaxJurisdiction,
  ReportFormat,
  TxType,
} from '../types/common.js';
import { getSupabaseClient } from '../db/client.js';
import * as walletsDb from '../db/wallets.js';
import * as txDb from '../db/transactions.js';
import * as cbDb from '../db/cost-basis.js';
import * as eventsDb from '../db/tax-events.js';
import * as summariesDb from '../db/summaries.js';
import { createProviderRegistry } from '../providers/index.js';
import {
  classifyTransaction,
  type ClassifiableTransaction,
} from '../analysis/transaction-classifier.js';
import {
  calculateCostBasis,
  classifyGainType,
  getHoldingPeriod,
} from '../analysis/cost-basis-calculator.js';
import {
  calculateTaxableEvents,
  calculateIncome,
  aggregateByYear,
  estimateTax,
} from '../analysis/tax-calculator.js';
import {
  buildPositions,
  findHarvestingOpportunities,
  calculateWashSaleRisk,
  estimateTaxSavings,
} from '../analysis/tax-loss-harvester.js';
import { formatUsd, abbreviateAddress, snakeToTitle } from '../utils/text.js';
import { toIsoDate, taxYearRange, currentTaxYear } from '../utils/date.js';
import { logger } from '../utils/logger.js';
import { getErrorMessage } from '../utils/errors.js';
import { PLUGIN_NAME } from '../plugin-id.js';

/**
 * Create all 12 tool definitions.
 */
export function createTools(config: PluginConfig): ToolDefinition[] {
  const db = getSupabaseClient(config);
  const tenantId = config.tenantId;
  const registry = createProviderRegistry(config);

  // ----- 1. tax_import_wallet -----
  const importWallet: ToolDefinition = {
    name: 'tax_import_wallet',
    description:
      'Import a crypto wallet and fetch all its transactions. Supports Ethereum, Solana, BSC, Arbitrum, Base, Polygon, Avalanche, and Bitcoin.',
    inputSchema: z.object({
      address: z.string().min(1).describe('Wallet address to import'),
      chain: z.enum(CHAINS).describe('Blockchain network'),
      label: z.string().optional().describe('Optional label for the wallet'),
    }),
    handler: async (raw) => {
      const args = importWallet.inputSchema.parse(raw) as {
        address: string;
        chain: Chain;
        label?: string;
      };
      try {
        // Check if already imported
        const existing = await walletsDb.findWalletByAddress(
          db,
          tenantId,
          args.address,
          args.chain,
        );
        if (existing) {
          return ok(
            `Wallet ${abbreviateAddress(args.address)} on ${args.chain} is already imported (ID: ${existing.id}).`,
          );
        }

        // Insert wallet
        const wallet = await walletsDb.insertWallet(db, {
          tenant_id: tenantId,
          address: args.address.toLowerCase(),
          chain: args.chain,
          label: args.label ?? null,
        });

        // Fetch transactions from provider
        const provider = registry.getTransactionProvider(args.chain);
        let txCount = 0;
        if (provider) {
          const rawTxs = await provider.fetchTransactions(args.address, args.chain);
          const mapped = rawTxs.map((raw) => ({
            tenant_id: tenantId,
            wallet_id: wallet.id,
            tx_hash: raw.hash,
            chain: raw.chain,
            tx_type: 'transfer_in' as TxType,
            from_address: raw.from,
            to_address: raw.to,
            token_address: raw.tokenAddress,
            token_symbol: raw.tokenSymbol,
            amount: raw.amount,
            price_usd: 0,
            value_usd: 0,
            fee_usd: 0,
            fee_token: null,
            timestamp: new Date(raw.timestamp * 1000).toISOString(),
            is_classified: false,
            classification_notes: null,
          }));
          if (mapped.length > 0) {
            await txDb.insertTransactions(db, mapped);
            txCount = mapped.length;
          }
        }

        return ok(
          `Imported wallet ${abbreviateAddress(args.address)} on ${args.chain}` +
            (args.label ? ` (${args.label})` : '') +
            `.\nWallet ID: ${wallet.id}\nTransactions fetched: ${txCount}` +
            (txCount > 0 ? `\nRun tax_classify_transactions to auto-classify them.` : ''),
        );
      } catch (e) {
        return err(`Failed to import wallet: ${getErrorMessage(e)}`);
      }
    },
  };

  // ----- 2. tax_classify_transactions -----
  const classifyTransactions: ToolDefinition = {
    name: 'tax_classify_transactions',
    description:
      'Auto-classify transactions by type (swap, stake, bridge, airdrop, etc.) using on-chain data analysis.',
    inputSchema: z.object({
      wallet_id: z.string().optional().describe('Classify only transactions for this wallet'),
      tx_id: z.string().optional().describe('Classify a single transaction'),
    }),
    handler: async (raw) => {
      const args = classifyTransactions.inputSchema.parse(raw) as {
        wallet_id?: string;
        tx_id?: string;
      };
      try {
        let txns: Awaited<ReturnType<typeof txDb.getUnclassifiedTransactions>>;

        if (args.tx_id) {
          const tx = await txDb.getTransactionById(db, args.tx_id);
          txns = tx ? [tx] : [];
        } else if (args.wallet_id) {
          const all = await txDb.getTransactionsByWallet(db, args.wallet_id);
          txns = all.filter((t) => !t.is_classified);
        } else {
          txns = await txDb.getUnclassifiedTransactions(db, tenantId);
        }

        if (txns.length === 0) return ok('No unclassified transactions found.');

        let classified = 0;
        const typeCounts: Record<string, number> = {};

        for (const tx of txns) {
          const wallet = await walletsDb.getWalletById(db, tx.wallet_id);
          const classifiable: ClassifiableTransaction = {
            from_address: tx.from_address,
            to_address: tx.to_address,
            token_symbol: tx.token_symbol,
            amount: tx.amount,
            fee_usd: tx.fee_usd,
            tx_hash: tx.tx_hash,
            wallet_address: wallet?.address ?? '',
          };

          const txType = classifyTransaction(classifiable);
          await txDb.updateTransactionType(db, tx.id, txType, `Auto-classified as ${txType}`);
          classified++;
          typeCounts[txType] = (typeCounts[txType] ?? 0) + 1;
        }

        const breakdown = Object.entries(typeCounts)
          .map(([type, count]) => `  ${snakeToTitle(type)}: ${count}`)
          .join('\n');

        return ok(
          `Classified ${classified} transactions:\n${breakdown}`,
        );
      } catch (e) {
        return err(`Classification failed: ${getErrorMessage(e)}`);
      }
    },
  };

  // ----- 3. tax_calculate_gains -----
  const calculateGains: ToolDefinition = {
    name: 'tax_calculate_gains',
    description:
      'Calculate all capital gains and losses for a tax year using the specified cost basis method (FIFO, LIFO, HIFO, ACB).',
    inputSchema: z.object({
      tax_year: z.number().int().optional().describe('Tax year (default: current year)'),
      method: z.enum(COST_BASIS_METHODS).optional().describe('Cost basis method (default: fifo)'),
    }),
    handler: async (raw) => {
      const args = calculateGains.inputSchema.parse(raw) as {
        tax_year?: number;
        method?: CostBasisMethod;
      };
      try {
        const year = args.tax_year ?? config.taxYear;
        const method = args.method ?? config.defaultCostBasisMethod;

        const txns = await txDb.getTransactionsByTenant(db, tenantId, year);
        const lots = await cbDb.getAllLotsByTenant(db, tenantId);

        if (txns.length === 0) return ok(`No transactions found for tax year ${year}.`);

        const events = calculateTaxableEvents(txns, lots, method, config.defaultJurisdiction);
        const income = calculateIncome(txns);
        const yearly = aggregateByYear(events, income);
        const summary = yearly.get(year);

        // Save events to DB
        if (events.length > 0) {
          await eventsDb.deleteTaxEventsByYear(db, tenantId, year);
          await eventsDb.insertTaxEvents(db, events);
        }

        if (!summary) return ok(`No taxable events found for ${year}.`);

        const netGain =
          summary.short_term_gains + summary.long_term_gains - summary.total_losses;

        return ok(
          `Capital Gains/Losses for ${year} (${method.toUpperCase()}):\n` +
            `  Short-term gains:  ${formatUsd(summary.short_term_gains)}\n` +
            `  Long-term gains:   ${formatUsd(summary.long_term_gains)}\n` +
            `  Total losses:      ${formatUsd(summary.total_losses)}\n` +
            `  Net gain/loss:     ${formatUsd(netGain)}\n` +
            `  Income:            ${formatUsd(summary.total_income)}\n` +
            `  Transactions:      ${txns.length}\n` +
            `  Tax events:        ${events.length}`,
        );
      } catch (e) {
        return err(`Gain calculation failed: ${getErrorMessage(e)}`);
      }
    },
  };

  // ----- 4. tax_get_summary -----
  const getSummary: ToolDefinition = {
    name: 'tax_get_summary',
    description: 'Get a full tax summary for a given year and jurisdiction.',
    inputSchema: z.object({
      tax_year: z.number().int().optional().describe('Tax year (default: current year)'),
      jurisdiction: z
        .enum(TAX_JURISDICTIONS)
        .optional()
        .describe('Tax jurisdiction (default: us)'),
    }),
    handler: async (raw) => {
      const args = getSummary.inputSchema.parse(raw) as {
        tax_year?: number;
        jurisdiction?: TaxJurisdiction;
      };
      try {
        const year = args.tax_year ?? config.taxYear;
        const jurisdiction = args.jurisdiction ?? config.defaultJurisdiction;

        const events = await eventsDb.getTaxEventsByYear(db, tenantId, year);
        const txns = await txDb.getTransactionsByTenant(db, tenantId, year);

        if (events.length === 0) {
          return ok(
            `No tax events for ${year}. Run tax_calculate_gains first.`,
          );
        }

        const eventInputs = events.map((e) => ({
          tenant_id: e.tenant_id,
          tx_id: e.tx_id,
          event_type: e.event_type,
          gain_type: e.gain_type,
          proceeds_usd: e.proceeds_usd,
          cost_basis_usd: e.cost_basis_usd,
          gain_loss_usd: e.gain_loss_usd,
          holding_period_days: e.holding_period_days,
          method: e.method,
          tax_year: e.tax_year,
        }));

        const incomeEvents = calculateIncome(txns);
        const yearly = aggregateByYear(eventInputs, incomeEvents);
        const summary = yearly.get(year);

        if (!summary) return ok(`No summary data for ${year}.`);

        const estimated = estimateTax(summary, jurisdiction);

        return ok(
          `Tax Summary for ${year} (${jurisdiction.toUpperCase()}):\n` +
            `  Total proceeds:    ${formatUsd(summary.total_proceeds)}\n` +
            `  Total cost basis:  ${formatUsd(summary.total_cost_basis)}\n` +
            `  Short-term gains:  ${formatUsd(summary.short_term_gains)}\n` +
            `  Long-term gains:   ${formatUsd(summary.long_term_gains)}\n` +
            `  Total losses:      ${formatUsd(summary.total_losses)}\n` +
            `  Total income:      ${formatUsd(summary.total_income)}\n` +
            `  Estimated tax:     ${formatUsd(estimated)}\n` +
            `\nDisclaimer: This is an estimate. Consult a tax professional.`,
        );
      } catch (e) {
        return err(`Summary failed: ${getErrorMessage(e)}`);
      }
    },
  };

  // ----- 5. tax_generate_report -----
  const generateReport: ToolDefinition = {
    name: 'tax_generate_report',
    description:
      'Generate a formatted tax report (Form 8949, Schedule D, CSV, summary, or detailed).',
    inputSchema: z.object({
      tax_year: z.number().int().describe('Tax year to report'),
      format: z.enum(REPORT_FORMATS).describe('Report format'),
      jurisdiction: z
        .enum(TAX_JURISDICTIONS)
        .optional()
        .describe('Tax jurisdiction (default: us)'),
    }),
    handler: async (raw) => {
      const args = generateReport.inputSchema.parse(raw) as {
        tax_year: number;
        format: ReportFormat;
        jurisdiction?: TaxJurisdiction;
      };
      try {
        const events = await eventsDb.getTaxEventsByYear(db, tenantId, args.tax_year);
        if (events.length === 0) {
          return ok(`No tax events for ${args.tax_year}. Run tax_calculate_gains first.`);
        }

        const jurisdiction = args.jurisdiction ?? config.defaultJurisdiction;

        switch (args.format) {
          case 'csv':
            return ok(formatCsv(events));
          case 'form_8949':
            return ok(formatForm8949(events, args.tax_year));
          case 'schedule_d':
            return ok(formatScheduleD(events, args.tax_year));
          case 'detailed':
            return ok(formatDetailed(events, args.tax_year, jurisdiction));
          case 'summary':
          default:
            return ok(formatSummaryReport(events, args.tax_year, jurisdiction));
        }
      } catch (e) {
        return err(`Report generation failed: ${getErrorMessage(e)}`);
      }
    },
  };

  // ----- 6. tax_find_harvesting -----
  const findHarvesting: ToolDefinition = {
    name: 'tax_find_harvesting',
    description:
      'Find tax-loss harvesting opportunities in current holdings. Identifies assets trading below cost basis.',
    inputSchema: z.object({
      min_loss_usd: z
        .number()
        .optional()
        .describe('Minimum unrealized loss in USD to show (default: 0)'),
    }),
    handler: async (raw) => {
      const args = findHarvesting.inputSchema.parse(raw) as { min_loss_usd?: number };
      try {
        const lots = await cbDb.getAllLotsByTenant(db, tenantId);
        const positions = buildPositions(lots);

        if (positions.length === 0) {
          return ok('No holdings found. Import wallets and calculate gains first.');
        }

        // In a real implementation, we'd fetch current prices from the provider.
        // For now, return the positions analysis.
        return ok(
          `Holdings Analysis (${positions.length} tokens):\n` +
            positions
              .map(
                (p) =>
                  `  ${p.tokenSymbol}: ${p.totalAmount.toFixed(6)} units, avg cost ${formatUsd(p.avgCostPerUnit)}, total basis ${formatUsd(p.totalCostBasis)}`,
              )
              .join('\n') +
            `\n\nTo find harvesting opportunities, current market prices are needed.\n` +
            `Configure a price provider API key for live analysis.`,
        );
      } catch (e) {
        return err(`Harvesting analysis failed: ${getErrorMessage(e)}`);
      }
    },
  };

  // ----- 7. tax_get_cost_basis -----
  const getCostBasis: ToolDefinition = {
    name: 'tax_get_cost_basis',
    description: 'Get the current cost basis for a specific token across all lots.',
    inputSchema: z.object({
      token: z.string().min(1).describe('Token symbol (e.g., ETH, BTC)'),
      method: z
        .enum(COST_BASIS_METHODS)
        .optional()
        .describe('Cost basis method (default: fifo)'),
    }),
    handler: async (raw) => {
      const args = getCostBasis.inputSchema.parse(raw) as {
        token: string;
        method?: CostBasisMethod;
      };
      try {
        const lots = await cbDb.getAvailableLots(db, tenantId, args.token.toUpperCase());
        if (lots.length === 0) {
          return ok(`No cost basis lots found for ${args.token.toUpperCase()}.`);
        }

        const totalAmount = lots.reduce((s, l) => s + l.remaining_amount, 0);
        const totalCost = lots.reduce(
          (s, l) => s + l.remaining_amount * l.cost_per_unit_usd,
          0,
        );
        const avgCost = totalAmount > 0 ? totalCost / totalAmount : 0;

        const lotDetails = lots
          .map(
            (l) =>
              `  Lot ${l.id.slice(0, 8)}: ${l.remaining_amount.toFixed(6)} @ ${formatUsd(l.cost_per_unit_usd)} (acquired ${toIsoDate(l.acquired_at)} via ${l.acquired_via})`,
          )
          .join('\n');

        return ok(
          `Cost Basis for ${args.token.toUpperCase()} (${(args.method ?? config.defaultCostBasisMethod).toUpperCase()}):\n` +
            `  Total holdings:    ${totalAmount.toFixed(6)}\n` +
            `  Total cost basis:  ${formatUsd(totalCost)}\n` +
            `  Average cost:      ${formatUsd(avgCost)}/unit\n` +
            `  Active lots:       ${lots.length}\n\n` +
            `Lot details:\n${lotDetails}`,
        );
      } catch (e) {
        return err(`Cost basis lookup failed: ${getErrorMessage(e)}`);
      }
    },
  };

  // ----- 8. tax_track_income -----
  const trackIncome: ToolDefinition = {
    name: 'tax_track_income',
    description:
      'Record a crypto income event (mining, staking, airdrop, DeFi yield, salary, bounty, referral).',
    inputSchema: z.object({
      tx_type: z.enum(['mining', 'staking', 'airdrop', 'defi_yield', 'salary', 'bounty', 'referral']).describe('Income type'),
      amount: z.number().positive().describe('Amount of tokens received'),
      token: z.string().min(1).describe('Token symbol'),
      date: z.string().describe('Date of income (YYYY-MM-DD)'),
      value_usd: z.number().optional().describe('USD value at time of receipt'),
    }),
    handler: async (raw) => {
      const args = trackIncome.inputSchema.parse(raw) as {
        tx_type: string;
        amount: number;
        token: string;
        date: string;
        value_usd?: number;
      };
      try {
        const wallets = await walletsDb.getWalletsByTenant(db, tenantId);
        const walletId = wallets[0]?.id ?? 'manual';

        const txn = {
          tenant_id: tenantId,
          wallet_id: walletId,
          tx_hash: `manual-income-${Date.now()}`,
          chain: 'ethereum' as Chain,
          tx_type: 'income' as TxType,
          from_address: 'income',
          to_address: 'self',
          token_address: null,
          token_symbol: args.token.toUpperCase(),
          amount: args.amount,
          price_usd: args.value_usd ? args.value_usd / args.amount : 0,
          value_usd: args.value_usd ?? 0,
          fee_usd: 0,
          fee_token: null,
          timestamp: new Date(args.date).toISOString(),
          is_classified: true,
          classification_notes: `Manual income: ${args.tx_type}`,
        };

        const [inserted] = await txDb.insertTransactions(db, [txn]);

        // Also create a cost basis lot for the received tokens
        await cbDb.insertCostBasisLot(db, {
          tenant_id: tenantId,
          token_symbol: args.token.toUpperCase(),
          chain: 'ethereum',
          amount: args.amount,
          cost_per_unit_usd: args.value_usd ? args.value_usd / args.amount : 0,
          total_cost_usd: args.value_usd ?? 0,
          acquired_at: new Date(args.date).toISOString(),
          acquired_via: 'income',
          remaining_amount: args.amount,
          is_consumed: false,
        });

        return ok(
          `Income recorded:\n` +
            `  Type:   ${snakeToTitle(args.tx_type)}\n` +
            `  Token:  ${args.token.toUpperCase()}\n` +
            `  Amount: ${args.amount}\n` +
            `  Value:  ${args.value_usd ? formatUsd(args.value_usd) : 'Unknown'}\n` +
            `  Date:   ${args.date}\n` +
            `  TX ID:  ${inserted?.id ?? 'N/A'}`,
        );
      } catch (e) {
        return err(`Income tracking failed: ${getErrorMessage(e)}`);
      }
    },
  };

  // ----- 9. tax_compare_methods -----
  const compareMethods: ToolDefinition = {
    name: 'tax_compare_methods',
    description:
      'Compare tax outcomes across FIFO, LIFO, and HIFO methods for a given tax year.',
    inputSchema: z.object({
      tax_year: z.number().int().optional().describe('Tax year (default: current year)'),
    }),
    handler: async (raw) => {
      const args = compareMethods.inputSchema.parse(raw) as { tax_year?: number };
      try {
        const year = args.tax_year ?? config.taxYear;
        const txns = await txDb.getTransactionsByTenant(db, tenantId, year);
        const lots = await cbDb.getAllLotsByTenant(db, tenantId);

        if (txns.length === 0) return ok(`No transactions for ${year}.`);

        const methods: CostBasisMethod[] = ['fifo', 'lifo', 'hifo'];
        const results: string[] = [];

        for (const method of methods) {
          const freshLots = lots.map((l) => ({ ...l }));
          const events = calculateTaxableEvents(
            txns,
            freshLots,
            method,
            config.defaultJurisdiction,
          );
          const income = calculateIncome(txns);
          const yearly = aggregateByYear(events, income);
          const summary = yearly.get(year);

          if (summary) {
            const net =
              summary.short_term_gains + summary.long_term_gains - summary.total_losses;
            const tax = estimateTax(summary, config.defaultJurisdiction);
            results.push(
              `${method.toUpperCase()}:\n` +
                `  Short-term: ${formatUsd(summary.short_term_gains)} | Long-term: ${formatUsd(summary.long_term_gains)}\n` +
                `  Losses: ${formatUsd(summary.total_losses)} | Net: ${formatUsd(net)}\n` +
                `  Estimated tax: ${formatUsd(tax)}`,
            );
          } else {
            results.push(`${method.toUpperCase()}: No taxable events.`);
          }
        }

        return ok(`Method Comparison for ${year}:\n\n${results.join('\n\n')}`);
      } catch (e) {
        return err(`Method comparison failed: ${getErrorMessage(e)}`);
      }
    },
  };

  // ----- 10. tax_get_unrealized -----
  const getUnrealized: ToolDefinition = {
    name: 'tax_get_unrealized',
    description: 'Get unrealized gains and losses for all current holdings.',
    inputSchema: z.object({}),
    handler: async () => {
      try {
        const lots = await cbDb.getAllLotsByTenant(db, tenantId);
        const positions = buildPositions(lots);

        if (positions.length === 0) {
          return ok('No holdings found. Import wallets first.');
        }

        const lines = positions.map(
          (p) =>
            `  ${p.tokenSymbol}: ${p.totalAmount.toFixed(6)} units | Avg cost: ${formatUsd(p.avgCostPerUnit)} | Total basis: ${formatUsd(p.totalCostBasis)}`,
        );

        return ok(
          `Unrealized Positions (${positions.length} tokens):\n${lines.join('\n')}\n\n` +
            `Note: Connect a price provider API key for live unrealized gain/loss calculations.`,
        );
      } catch (e) {
        return err(`Unrealized calculation failed: ${getErrorMessage(e)}`);
      }
    },
  };

  // ----- 11. tax_audit_transactions -----
  const auditTransactions: ToolDefinition = {
    name: 'tax_audit_transactions',
    description:
      'Audit transactions to find unclassified, missing price data, or suspicious entries.',
    inputSchema: z.object({}),
    handler: async () => {
      try {
        const allTxns = await txDb.getTransactionsByTenant(db, tenantId);
        if (allTxns.length === 0) return ok('No transactions to audit.');

        const unclassified = allTxns.filter((t) => !t.is_classified);
        const missingPrice = allTxns.filter((t) => t.price_usd === 0 && t.value_usd === 0);
        const highValue = allTxns.filter((t) => t.value_usd > 100_000);
        const zeroAmount = allTxns.filter((t) => t.amount === 0);

        const issues: string[] = [];

        if (unclassified.length > 0)
          issues.push(`  Unclassified transactions: ${unclassified.length}`);
        if (missingPrice.length > 0)
          issues.push(`  Missing price data: ${missingPrice.length}`);
        if (highValue.length > 0)
          issues.push(`  High-value transactions (>$100k): ${highValue.length}`);
        if (zeroAmount.length > 0)
          issues.push(`  Zero-amount transactions: ${zeroAmount.length}`);

        if (issues.length === 0) {
          return ok(
            `Audit complete: ${allTxns.length} transactions reviewed. No issues found.`,
          );
        }

        return ok(
          `Transaction Audit (${allTxns.length} total):\n${issues.join('\n')}\n\n` +
            `Recommendations:\n` +
            (unclassified.length > 0
              ? `  - Run tax_classify_transactions to classify pending transactions\n`
              : '') +
            (missingPrice.length > 0
              ? `  - Price data needed for ${missingPrice.length} transactions\n`
              : '') +
            (highValue.length > 0
              ? `  - Review ${highValue.length} high-value transactions manually\n`
              : ''),
        );
      } catch (e) {
        return err(`Audit failed: ${getErrorMessage(e)}`);
      }
    },
  };

  // ----- 12. tax_status -----
  const status: ToolDefinition = {
    name: 'tax_status',
    description: 'Check the health and status of the Lucid Tax system.',
    inputSchema: z.object({}),
    handler: async () => {
      try {
        const wallets = await walletsDb.getWalletsByTenant(db, tenantId);
        const txns = await txDb.getTransactionsByTenant(db, tenantId);
        const lots = await cbDb.getAllLotsByTenant(db, tenantId);
        const events = await eventsDb.getTaxEventsByTenant(db, tenantId);

        const providers = registry.transactionProviders.map((p) => p.name);
        const priceProviders = registry.priceProviders.map((p) => p.name);

        return ok(
          `${PLUGIN_NAME} Status:\n` +
            `  Tenant:              ${tenantId}\n` +
            `  Tax year:            ${config.taxYear}\n` +
            `  Jurisdiction:        ${config.defaultJurisdiction.toUpperCase()}\n` +
            `  Cost basis method:   ${config.defaultCostBasisMethod.toUpperCase()}\n` +
            `  Wallets:             ${wallets.length}\n` +
            `  Transactions:        ${txns.length}\n` +
            `  Cost basis lots:     ${lots.length}\n` +
            `  Tax events:          ${events.length}\n` +
            `  TX providers:        ${providers.length > 0 ? providers.join(', ') : 'None'}\n` +
            `  Price providers:     ${priceProviders.length > 0 ? priceProviders.join(', ') : 'None'}`,
        );
      } catch (e) {
        return err(`Status check failed: ${getErrorMessage(e)}`);
      }
    },
  };

  return [
    importWallet,
    classifyTransactions,
    calculateGains,
    getSummary,
    generateReport,
    findHarvesting,
    getCostBasis,
    trackIncome,
    compareMethods,
    getUnrealized,
    auditTransactions,
    status,
  ];
}

// --- Report formatters ---

function formatCsv(events: { event_type: string; gain_type: string | null; proceeds_usd: number; cost_basis_usd: number; gain_loss_usd: number; holding_period_days: number | null; method: string; tax_year: number }[]): string {
  const header = 'event_type,gain_type,proceeds_usd,cost_basis_usd,gain_loss_usd,holding_period_days,method,tax_year';
  const rows = events.map(
    (e) =>
      `${e.event_type},${e.gain_type ?? ''},${e.proceeds_usd.toFixed(2)},${e.cost_basis_usd.toFixed(2)},${e.gain_loss_usd.toFixed(2)},${e.holding_period_days ?? ''},${e.method},${e.tax_year}`,
  );
  return [header, ...rows].join('\n');
}

function formatForm8949(events: { event_type: string; gain_type: string | null; proceeds_usd: number; cost_basis_usd: number; gain_loss_usd: number; holding_period_days: number | null }[], year: number): string {
  const stEvents = events.filter((e) => e.gain_type === 'short_term');
  const ltEvents = events.filter((e) => e.gain_type === 'long_term');

  let report = `Form 8949 - Sales and Dispositions of Capital Assets (${year})\n`;
  report += `${'='.repeat(60)}\n\n`;

  report += `Part I - Short-Term (held one year or less)\n`;
  report += `-`.repeat(60) + '\n';
  let stTotal = 0;
  for (const e of stEvents) {
    report += `  Proceeds: ${formatUsd(e.proceeds_usd)} | Basis: ${formatUsd(e.cost_basis_usd)} | Gain/Loss: ${formatUsd(e.gain_loss_usd)}\n`;
    stTotal += e.gain_loss_usd;
  }
  report += `  TOTAL: ${formatUsd(stTotal)}\n\n`;

  report += `Part II - Long-Term (held more than one year)\n`;
  report += `-`.repeat(60) + '\n';
  let ltTotal = 0;
  for (const e of ltEvents) {
    report += `  Proceeds: ${formatUsd(e.proceeds_usd)} | Basis: ${formatUsd(e.cost_basis_usd)} | Gain/Loss: ${formatUsd(e.gain_loss_usd)}\n`;
    ltTotal += e.gain_loss_usd;
  }
  report += `  TOTAL: ${formatUsd(ltTotal)}\n`;

  return report;
}

function formatScheduleD(events: { gain_type: string | null; gain_loss_usd: number }[], year: number): string {
  const stGain = events
    .filter((e) => e.gain_type === 'short_term' && e.gain_loss_usd > 0)
    .reduce((s, e) => s + e.gain_loss_usd, 0);
  const stLoss = events
    .filter((e) => e.gain_type === 'short_term' && e.gain_loss_usd < 0)
    .reduce((s, e) => s + e.gain_loss_usd, 0);
  const ltGain = events
    .filter((e) => e.gain_type === 'long_term' && e.gain_loss_usd > 0)
    .reduce((s, e) => s + e.gain_loss_usd, 0);
  const ltLoss = events
    .filter((e) => e.gain_type === 'long_term' && e.gain_loss_usd < 0)
    .reduce((s, e) => s + e.gain_loss_usd, 0);

  return (
    `Schedule D - Capital Gains and Losses (${year})\n` +
    `${'='.repeat(50)}\n\n` +
    `Part I - Short-Term:\n` +
    `  Gains:  ${formatUsd(stGain)}\n` +
    `  Losses: ${formatUsd(stLoss)}\n` +
    `  Net:    ${formatUsd(stGain + stLoss)}\n\n` +
    `Part II - Long-Term:\n` +
    `  Gains:  ${formatUsd(ltGain)}\n` +
    `  Losses: ${formatUsd(ltLoss)}\n` +
    `  Net:    ${formatUsd(ltGain + ltLoss)}\n\n` +
    `Combined Net: ${formatUsd(stGain + stLoss + ltGain + ltLoss)}`
  );
}

function formatDetailed(events: { event_type: string; gain_type: string | null; proceeds_usd: number; cost_basis_usd: number; gain_loss_usd: number; holding_period_days: number | null; method: string }[], year: number, jurisdiction: string): string {
  let report = `Detailed Tax Report - ${year} (${jurisdiction.toUpperCase()})\n`;
  report += `${'='.repeat(60)}\n\n`;
  report += `Total events: ${events.length}\n\n`;

  for (let i = 0; i < events.length; i++) {
    const e = events[i]!;
    report += `Event #${i + 1}:\n`;
    report += `  Type:           ${snakeToTitle(e.event_type)}\n`;
    report += `  Gain type:      ${e.gain_type ? snakeToTitle(e.gain_type) : 'N/A'}\n`;
    report += `  Proceeds:       ${formatUsd(e.proceeds_usd)}\n`;
    report += `  Cost basis:     ${formatUsd(e.cost_basis_usd)}\n`;
    report += `  Gain/Loss:      ${formatUsd(e.gain_loss_usd)}\n`;
    report += `  Holding period: ${e.holding_period_days ?? 'N/A'} days\n`;
    report += `  Method:         ${e.method.toUpperCase()}\n\n`;
  }

  return report;
}

function formatSummaryReport(events: { event_type: string; gain_type: string | null; gain_loss_usd: number; proceeds_usd: number; cost_basis_usd: number }[], year: number, jurisdiction: string): string {
  const gains = events.filter((e) => e.gain_loss_usd > 0);
  const losses = events.filter((e) => e.gain_loss_usd < 0);
  const totalProceeds = events.reduce((s, e) => s + e.proceeds_usd, 0);
  const totalBasis = events.reduce((s, e) => s + e.cost_basis_usd, 0);
  const totalNet = events.reduce((s, e) => s + e.gain_loss_usd, 0);

  return (
    `Tax Summary Report - ${year} (${jurisdiction.toUpperCase()})\n` +
    `${'='.repeat(50)}\n\n` +
    `  Total events:     ${events.length}\n` +
    `  Gaining events:   ${gains.length}\n` +
    `  Losing events:    ${losses.length}\n` +
    `  Total proceeds:   ${formatUsd(totalProceeds)}\n` +
    `  Total cost basis: ${formatUsd(totalBasis)}\n` +
    `  Net gain/loss:    ${formatUsd(totalNet)}\n\n` +
    `Disclaimer: This is an estimate. Consult a qualified tax professional.`
  );
}
