// ---------------------------------------------------------------------------
// Lucid Invoice — Tool Handlers (11 tools)
// ---------------------------------------------------------------------------

import { z } from 'zod';
import type { ToolDefinition } from './types.js';
import { ok } from './types.js';
import { withErrorHandling } from './adapters.js';
import {
  INVOICE_STATUSES,
  PAYMENT_METHODS,
  BILLING_CYCLES,
  CURRENCIES,
  REVENUE_PERIODS,
  CLIENT_STATUSES,
} from '../types/common.js';
import type {
  InvoiceStatus,
  PaymentMethod,
  BillingCycle,
  Currency,
  RevenuePeriod,
  ClientStatus,
} from '../types/common.js';
import { clientsDb, invoicesDb, paymentsDb, subscriptionsDb, revenueMetricsDb } from '../db/index.js';
import {
  calculateLineItems,
  applyDiscount,
  calculateTax,
  generateInvoiceNumber,
  calculateLateFee,
} from '../analysis/invoice-calculator.js';
import {
  calculateMrr,
  calculateArr,
  calculateChurnRate,
  projectRevenue,
  revenueByClient,
  revenueByPeriod,
} from '../analysis/revenue-analyzer.js';
import {
  trackPayment,
  checkOverdue,
  getOutstandingBalance,
  buildAgingReport,
} from '../analysis/payment-tracker.js';
import { PLUGIN_NAME, PLUGIN_VERSION } from '../core/plugin-id.js';

// ---------------------------------------------------------------------------
// 1. invoice_create_client
// ---------------------------------------------------------------------------

const createClientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  email: z.string().email('Valid email is required'),
  company: z.string().optional(),
  address: z.string().optional(),
  tax_id: z.string().optional(),
  payment_terms: z.number().int().min(0).optional().default(30),
});

const createClientTool: ToolDefinition = {
  name: 'invoice_create_client',
  description:
    'Create a new client for invoicing. Provide name, email, optional company, address, tax ID, and payment terms (net days).',
  inputSchema: createClientSchema,
  handler: async (raw) => {
    const input = createClientSchema.parse(raw);
    const client = await clientsDb.createClient({
      name: input.name,
      email: input.email,
      company: input.company ?? null,
      address: input.address ?? null,
      tax_id: input.tax_id ?? null,
      payment_terms: input.payment_terms,
      status: 'active',
    });
    return ok({ message: `Client "${client.name}" created successfully`, client });
  },
};

// ---------------------------------------------------------------------------
// 2. invoice_create_invoice
// ---------------------------------------------------------------------------

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
});

const createInvoiceSchema = z.object({
  client_id: z.string().uuid('Valid client ID is required'),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  tax_rate: z.number().min(0).max(100).optional(),
  discount: z.number().min(0).optional().default(0),
  discount_type: z.enum(['flat', 'percentage']).optional().default('flat'),
  currency: z.enum(CURRENCIES as unknown as [string, ...string[]]).optional(),
  notes: z.string().optional(),
  payment_terms: z.number().int().min(0).optional(),
});

const createInvoiceTool: ToolDefinition = {
  name: 'invoice_create_invoice',
  description:
    'Create a new invoice for a client. Provide client_id, line items (description, quantity, unit_price), optional tax_rate, discount, currency, and notes.',
  inputSchema: createInvoiceSchema,
  handler: async (raw) => {
    const input = createInvoiceSchema.parse(raw);

    // Fetch client for defaults
    const client = await clientsDb.getClientById(input.client_id);
    const paymentTerms = input.payment_terms ?? client.payment_terms;

    // Calculate
    const { lineItems, subtotal } = calculateLineItems(input.items);
    const { discountAmount, discountedSubtotal } = applyDiscount(
      subtotal,
      input.discount,
      input.discount_type,
    );
    const taxRate = input.tax_rate ?? 0;
    const { taxAmount, total } = calculateTax(discountedSubtotal, taxRate);

    // Generate invoice number
    const count = await invoicesDb.getInvoiceCount();
    const invoiceNumber = generateInvoiceNumber(count + 1);

    const issueDate = new Date().toISOString().split('T')[0]!;
    const dueDate = new Date(Date.now() + paymentTerms * 86400000).toISOString().split('T')[0]!;

    const invoice = await invoicesDb.createInvoice({
      client_id: input.client_id,
      invoice_number: invoiceNumber,
      status: 'draft',
      issue_date: issueDate,
      due_date: dueDate,
      items: lineItems,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      discount: discountAmount,
      total,
      currency: (input.currency as Currency) ?? 'USD',
      notes: input.notes ?? null,
      paid_at: null,
      sent_at: null,
    });

    return ok({
      message: `Invoice ${invoiceNumber} created for $${total.toFixed(2)}`,
      invoice,
    });
  },
};

// ---------------------------------------------------------------------------
// 3. invoice_send_invoice
// ---------------------------------------------------------------------------

const sendInvoiceSchema = z.object({
  invoice_id: z.string().uuid('Valid invoice ID is required'),
});

const sendInvoiceTool: ToolDefinition = {
  name: 'invoice_send_invoice',
  description:
    'Mark an invoice as sent. In production, this would trigger email delivery to the client.',
  inputSchema: sendInvoiceSchema,
  handler: async (raw) => {
    const input = sendInvoiceSchema.parse(raw);
    const invoice = await invoicesDb.getInvoiceById(input.invoice_id);

    if (invoice.status !== 'draft') {
      return ok({ message: `Invoice is already in "${invoice.status}" status — cannot send.` });
    }

    const updated = await invoicesDb.updateInvoice(input.invoice_id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return ok({
      message: `Invoice ${updated.invoice_number} marked as sent`,
      invoice: updated,
    });
  },
};

// ---------------------------------------------------------------------------
// 4. invoice_record_payment
// ---------------------------------------------------------------------------

const recordPaymentSchema = z.object({
  invoice_id: z.string().uuid('Valid invoice ID is required'),
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(PAYMENT_METHODS as unknown as [string, ...string[]]),
  reference: z.string().optional(),
});

const recordPaymentTool: ToolDefinition = {
  name: 'invoice_record_payment',
  description:
    'Record a payment against an invoice. Provide invoice_id, amount, payment method, and optional reference number.',
  inputSchema: recordPaymentSchema,
  handler: async (raw) => {
    const input = recordPaymentSchema.parse(raw);
    const invoice = await invoicesDb.getInvoiceById(input.invoice_id);
    const existingTotal = await paymentsDb.getTotalPaymentsForInvoice(input.invoice_id);

    const result = trackPayment(
      invoice.total,
      existingTotal,
      input.amount,
      input.method as PaymentMethod,
      input.reference ?? null,
    );

    const payment = await paymentsDb.createPayment({
      invoice_id: input.invoice_id,
      amount: result.amount,
      method: result.method,
      reference: result.reference,
      received_at: result.receivedAt,
    });

    if (result.fullyPaid) {
      await invoicesDb.updateInvoice(input.invoice_id, {
        status: 'paid',
        paid_at: new Date().toISOString(),
      });
    }

    return ok({
      message: result.fullyPaid
        ? `Payment recorded. Invoice ${invoice.invoice_number} is now fully paid.`
        : `Payment recorded. Remaining balance: $${result.remainingBalance.toFixed(2)}`,
      payment,
      remainingBalance: result.remainingBalance,
      fullyPaid: result.fullyPaid,
    });
  },
};

// ---------------------------------------------------------------------------
// 5. invoice_get_outstanding
// ---------------------------------------------------------------------------

const getOutstandingSchema = z.object({
  client_id: z.string().uuid().optional(),
});

const getOutstandingTool: ToolDefinition = {
  name: 'invoice_get_outstanding',
  description:
    'Get all outstanding (unpaid) invoices and total amounts. Optionally filter by client_id.',
  inputSchema: getOutstandingSchema,
  handler: async (raw) => {
    const input = getOutstandingSchema.parse(raw);
    const invoices = await invoicesDb.getOutstandingInvoices(input.client_id);
    const totalOutstanding = getOutstandingBalance(invoices);
    const overdue = checkOverdue(invoices);

    return ok({
      totalOutstanding,
      invoiceCount: invoices.length,
      overdueCount: overdue.length,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        clientId: inv.client_id,
        total: inv.total,
        dueDate: inv.due_date,
        status: inv.status,
      })),
      overdueInvoices: overdue,
    });
  },
};

// ---------------------------------------------------------------------------
// 6. invoice_create_subscription
// ---------------------------------------------------------------------------

const createSubscriptionSchema = z.object({
  client_id: z.string().uuid('Valid client ID is required'),
  plan_name: z.string().min(1, 'Plan name is required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.enum(CURRENCIES as unknown as [string, ...string[]]).optional().default('USD'),
  cycle: z.enum(BILLING_CYCLES as unknown as [string, ...string[]]),
});

const createSubscriptionTool: ToolDefinition = {
  name: 'invoice_create_subscription',
  description:
    'Create a recurring subscription for a client. Provide client_id, plan name, amount, currency, and billing cycle.',
  inputSchema: createSubscriptionSchema,
  handler: async (raw) => {
    const input = createSubscriptionSchema.parse(raw);
    // Verify client exists
    await clientsDb.getClientById(input.client_id);

    const startsAt = new Date().toISOString();
    const nextBilling = computeNextBilling(new Date(), input.cycle as BillingCycle);

    const subscription = await subscriptionsDb.createSubscription({
      client_id: input.client_id,
      plan_name: input.plan_name,
      amount: input.amount,
      currency: input.currency as Currency,
      cycle: input.cycle as BillingCycle,
      starts_at: startsAt,
      next_billing: nextBilling.toISOString(),
      status: 'active',
      stripe_id: null,
    });

    return ok({
      message: `Subscription "${input.plan_name}" created — ${input.cycle} billing of $${input.amount}`,
      subscription,
    });
  },
};

function computeNextBilling(from: Date, cycle: BillingCycle): Date {
  const d = new Date(from);
  switch (cycle) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'annual':
      d.setFullYear(d.getFullYear() + 1);
      break;
    case 'one_time':
      break;
  }
  return d;
}

// ---------------------------------------------------------------------------
// 7. invoice_get_revenue
// ---------------------------------------------------------------------------

const getRevenueSchema = z.object({
  period: z.enum(REVENUE_PERIODS as unknown as [string, ...string[]]),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

const getRevenueTool: ToolDefinition = {
  name: 'invoice_get_revenue',
  description:
    'Get revenue analytics including MRR, ARR, and growth metrics. Specify period granularity and optional date range.',
  inputSchema: getRevenueSchema,
  handler: async (raw) => {
    const input = getRevenueSchema.parse(raw);

    const subscriptions = await subscriptionsDb.listActiveSubscriptions();
    const invoices = await invoicesDb.listInvoices({
      from_date: input.start_date,
      to_date: input.end_date,
    });

    const mrr = calculateMrr(subscriptions);
    const arr = calculateArr(subscriptions);
    const byClient = revenueByClient(invoices);
    const byPeriod = revenueByPeriod(invoices);

    return ok({
      mrr,
      arr,
      activeSubscriptions: subscriptions.length,
      revenueByClient: byClient.slice(0, 10),
      revenueByPeriod: byPeriod,
      period: input.period,
    });
  },
};

// ---------------------------------------------------------------------------
// 8. invoice_manage_clients
// ---------------------------------------------------------------------------

const manageClientsSchema = z.object({
  action: z.enum(['list', 'get', 'update']),
  client_id: z.string().uuid().optional(),
  filters: z
    .object({
      status: z.enum(CLIENT_STATUSES as unknown as [string, ...string[]]).optional(),
      search: z.string().optional(),
    })
    .optional(),
  update_data: z
    .object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      company: z.string().optional(),
      address: z.string().optional(),
      tax_id: z.string().optional(),
      payment_terms: z.number().int().min(0).optional(),
      status: z.enum(CLIENT_STATUSES as unknown as [string, ...string[]]).optional(),
    })
    .optional(),
});

const manageClientsTool: ToolDefinition = {
  name: 'invoice_manage_clients',
  description:
    'Manage clients: list all, get by ID, or update client details. Actions: list, get, update.',
  inputSchema: manageClientsSchema,
  handler: async (raw) => {
    const input = manageClientsSchema.parse(raw);

    switch (input.action) {
      case 'list': {
        const clients = await clientsDb.listClients({
          status: input.filters?.status as ClientStatus | undefined,
          search: input.filters?.search,
        });
        return ok({ clients, count: clients.length });
      }
      case 'get': {
        if (!input.client_id) return ok({ error: 'client_id is required for "get" action' });
        const client = await clientsDb.getClientById(input.client_id);
        return ok({ client });
      }
      case 'update': {
        if (!input.client_id) return ok({ error: 'client_id is required for "update" action' });
        if (!input.update_data) return ok({ error: 'update_data is required for "update" action' });
        const updated = await clientsDb.updateClient(input.client_id, input.update_data as Record<string, unknown>);
        return ok({ message: 'Client updated successfully', client: updated });
      }
    }
  },
};

// ---------------------------------------------------------------------------
// 9. invoice_get_aging_report
// ---------------------------------------------------------------------------

const getAgingReportSchema = z.object({
  as_of: z.string().optional(),
});

const getAgingReportTool: ToolDefinition = {
  name: 'invoice_get_aging_report',
  description:
    'Generate an accounts receivable aging report showing outstanding invoices bucketed by current, 1-30, 31-60, 61-90, and 90+ days.',
  inputSchema: getAgingReportSchema,
  handler: async (raw) => {
    const input = getAgingReportSchema.parse(raw);
    const asOf = input.as_of ? new Date(input.as_of) : new Date();
    const invoices = await invoicesDb.getOutstandingInvoices();
    const aging = buildAgingReport(invoices, asOf);
    const totalOutstanding = aging.reduce((sum, b) => sum + b.total, 0);

    return ok({
      asOf: asOf.toISOString().split('T')[0],
      totalOutstanding,
      totalInvoices: aging.reduce((sum, b) => sum + b.count, 0),
      buckets: aging,
    });
  },
};

// ---------------------------------------------------------------------------
// 10. invoice_forecast_revenue
// ---------------------------------------------------------------------------

const forecastRevenueSchema = z.object({
  months: z.number().int().min(1).max(60).default(12),
  growth_rate: z.number().min(-100).max(1000).optional().default(0),
});

const forecastRevenueTool: ToolDefinition = {
  name: 'invoice_forecast_revenue',
  description:
    'Forecast revenue for the next N months based on current subscriptions and optional monthly growth rate (%).',
  inputSchema: forecastRevenueSchema,
  handler: async (raw) => {
    const input = forecastRevenueSchema.parse(raw);
    const subscriptions = await subscriptionsDb.listActiveSubscriptions();
    const currentMrr = calculateMrr(subscriptions);
    const projections = projectRevenue(currentMrr, input.months, input.growth_rate);

    return ok({
      currentMrr,
      currentArr: currentMrr * 12,
      growthRate: input.growth_rate,
      projections,
      totalProjected: projections.reduce((sum, p) => sum + p.projected, 0),
    });
  },
};

// ---------------------------------------------------------------------------
// 11. invoice_status
// ---------------------------------------------------------------------------

const statusSchema = z.object({});

const statusTool: ToolDefinition = {
  name: 'invoice_status',
  description: 'Check Lucid Invoice system health and configuration status.',
  inputSchema: statusSchema,
  handler: async () => {
    return ok({
      plugin: PLUGIN_NAME,
      version: PLUGIN_VERSION,
      status: 'operational',
      timestamp: new Date().toISOString(),
      capabilities: [
        'client_management',
        'invoice_creation',
        'payment_tracking',
        'subscription_billing',
        'revenue_analytics',
        'aging_reports',
        'revenue_forecasting',
      ],
    });
  },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export function createToolRegistry(): ToolDefinition[] {
  return [
    createClientTool,
    createInvoiceTool,
    sendInvoiceTool,
    recordPaymentTool,
    getOutstandingTool,
    createSubscriptionTool,
    getRevenueTool,
    manageClientsTool,
    getAgingReportTool,
    forecastRevenueTool,
    statusTool,
  ].map(withErrorHandling);
}
