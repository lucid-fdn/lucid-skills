// ---------------------------------------------------------------------------
// Lucid Invoice — Public API
// ---------------------------------------------------------------------------

// Core
export { PLUGIN_ID, PLUGIN_NAME, PLUGIN_VERSION } from './core/plugin-id.js';
export {
  InvoiceError,
  NotFoundError,
  ValidationError,
  DatabaseError,
  PaymentProviderError,
  ConfigError,
} from './core/errors.js';
export { logger } from './core/logger.js';
export { loadConfig } from './core/config-loader.js';

// Types
export * from './types/index.js';

// Analysis
export {
  calculateLineItems,
  applyDiscount,
  calculateTax,
  generateInvoiceNumber,
  calculateLateFee,
  roundCurrency,
} from './analysis/invoice-calculator.js';
export {
  calculateMrr,
  calculateArr,
  calculateChurnRate,
  projectRevenue,
  revenueByClient,
  revenueByPeriod,
} from './analysis/revenue-analyzer.js';
export {
  trackPayment,
  checkOverdue,
  sendReminder,
  reconcilePayments,
  getOutstandingBalance,
  buildAgingReport,
} from './analysis/payment-tracker.js';

// Tools
export { createToolRegistry } from './tools/handlers.js';
export type { ToolResult, ToolDefinition } from './tools/types.js';

// Server
export { createInvoiceServer } from './mcp.js';

// Services
export { runOverdueCheck, runSubscriptionBilling, runRevenueSnapshot } from './services/invoice-scheduler.js';
