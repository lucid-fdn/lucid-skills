-- Lucid Tax Schema Migration 001
-- Creates all tables for crypto tax tracking and reporting

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tax Wallets: tracked wallet addresses
CREATE TABLE IF NOT EXISTS tax_wallets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   TEXT NOT NULL,
  address     TEXT NOT NULL,
  chain       TEXT NOT NULL CHECK (chain IN ('ethereum','solana','bsc','arbitrum','base','polygon','avalanche','bitcoin')),
  label       TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, address, chain)
);

CREATE INDEX idx_tax_wallets_tenant ON tax_wallets (tenant_id);
CREATE INDEX idx_tax_wallets_address ON tax_wallets (address, chain);

-- Tax Transactions: individual on-chain transactions
CREATE TABLE IF NOT EXISTS tax_transactions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id            TEXT NOT NULL,
  wallet_id            UUID NOT NULL REFERENCES tax_wallets(id) ON DELETE CASCADE,
  tx_hash              TEXT NOT NULL,
  chain                TEXT NOT NULL,
  tx_type              TEXT NOT NULL CHECK (tx_type IN ('buy','sell','swap','transfer_in','transfer_out','stake','unstake','claim','mint','burn','bridge','airdrop','income','gift_received','gift_sent','lost','stolen')),
  from_address         TEXT NOT NULL,
  to_address           TEXT NOT NULL,
  token_address        TEXT,
  token_symbol         TEXT NOT NULL,
  amount               NUMERIC NOT NULL DEFAULT 0,
  price_usd            NUMERIC NOT NULL DEFAULT 0,
  value_usd            NUMERIC NOT NULL DEFAULT 0,
  fee_usd              NUMERIC NOT NULL DEFAULT 0,
  fee_token            TEXT,
  timestamp            TIMESTAMPTZ NOT NULL,
  is_classified        BOOLEAN NOT NULL DEFAULT false,
  classification_notes TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tax_tx_tenant ON tax_transactions (tenant_id);
CREATE INDEX idx_tax_tx_wallet ON tax_transactions (wallet_id);
CREATE INDEX idx_tax_tx_timestamp ON tax_transactions (timestamp);
CREATE INDEX idx_tax_tx_type ON tax_transactions (tx_type);
CREATE INDEX idx_tax_tx_token ON tax_transactions (token_symbol);
CREATE INDEX idx_tax_tx_classified ON tax_transactions (is_classified) WHERE is_classified = false;

-- Cost Basis Lots: individual tax lots for cost basis tracking
CREATE TABLE IF NOT EXISTS tax_cost_basis_lots (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         TEXT NOT NULL,
  token_symbol      TEXT NOT NULL,
  chain             TEXT NOT NULL,
  amount            NUMERIC NOT NULL,
  cost_per_unit_usd NUMERIC NOT NULL,
  total_cost_usd    NUMERIC NOT NULL,
  acquired_at       TIMESTAMPTZ NOT NULL,
  acquired_via      TEXT NOT NULL,
  remaining_amount  NUMERIC NOT NULL,
  is_consumed       BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_tax_lots_tenant ON tax_cost_basis_lots (tenant_id);
CREATE INDEX idx_tax_lots_token ON tax_cost_basis_lots (token_symbol);
CREATE INDEX idx_tax_lots_active ON tax_cost_basis_lots (tenant_id, token_symbol) WHERE is_consumed = false;

-- Tax Events: calculated taxable events (gains, losses, income)
CREATE TABLE IF NOT EXISTS tax_events (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           TEXT NOT NULL,
  tx_id               TEXT NOT NULL,
  event_type          TEXT NOT NULL CHECK (event_type IN ('capital_gain','capital_loss','income','expense')),
  gain_type           TEXT CHECK (gain_type IN ('short_term','long_term')),
  proceeds_usd        NUMERIC NOT NULL DEFAULT 0,
  cost_basis_usd      NUMERIC NOT NULL DEFAULT 0,
  gain_loss_usd       NUMERIC NOT NULL DEFAULT 0,
  holding_period_days INTEGER,
  method              TEXT NOT NULL CHECK (method IN ('fifo','lifo','hifo','acb','specific_id')),
  tax_year            INTEGER NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tax_events_tenant ON tax_events (tenant_id);
CREATE INDEX idx_tax_events_year ON tax_events (tenant_id, tax_year);
CREATE INDEX idx_tax_events_type ON tax_events (event_type);

-- Tax Summaries: aggregated annual tax summaries
CREATE TABLE IF NOT EXISTS tax_summaries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        TEXT NOT NULL,
  tax_year         INTEGER NOT NULL,
  jurisdiction     TEXT NOT NULL,
  total_proceeds   NUMERIC NOT NULL DEFAULT 0,
  total_cost_basis NUMERIC NOT NULL DEFAULT 0,
  short_term_gains NUMERIC NOT NULL DEFAULT 0,
  long_term_gains  NUMERIC NOT NULL DEFAULT 0,
  total_income     NUMERIC NOT NULL DEFAULT 0,
  total_losses     NUMERIC NOT NULL DEFAULT 0,
  estimated_tax    NUMERIC NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, tax_year, jurisdiction)
);

CREATE INDEX idx_tax_summaries_tenant ON tax_summaries (tenant_id);

-- Price History: cached historical token prices
CREATE TABLE IF NOT EXISTS tax_price_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_symbol TEXT NOT NULL,
  date         DATE NOT NULL,
  price_usd    NUMERIC NOT NULL,
  source       TEXT NOT NULL,
  UNIQUE (token_symbol, date, source)
);

CREATE INDEX idx_tax_prices_token ON tax_price_history (token_symbol, date);

-- Row-Level Security
ALTER TABLE tax_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_cost_basis_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_summaries ENABLE ROW LEVEL SECURITY;
