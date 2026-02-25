# lucid-trade v5 — Universal Trading MCP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform lucid-trade from pure AgentSkills markdown into a TypeScript MCP server with 125+ tools across 7+ exchanges, beating Senpi's 44 Hyperliquid-only tools by 3x.

**Architecture:** Exchange adapter pattern — each exchange implements `IExchangeAdapter`, tools consume adapters via registry. Intelligence layer (TA, risk, backtesting) operates on normalized data from any adapter. Dual export: MCP stdio + OpenClaw plugin.

**Tech Stack:** TypeScript strict, MCP SDK ^1.26.0, Zod, tsup, vitest, ethers v6, @solana/web3.js, decimal.js, bottleneck

**Reference:** See `docs/plans/2026-02-25-lucid-trade-v5-design.md` for full design doc with competitive analysis.

**Existing patterns:** Follow `skills/lucid-audit/` structure exactly — same bin.ts, mcp.ts, openclaw.ts, tsup.config.ts, vitest.config.ts patterns.

---

## Phase 1: Foundation Scaffold

### Task 1.1: Package scaffold

**Files:**
- Create: `skills/lucid-trade/package.json` (overwrite existing)
- Create: `skills/lucid-trade/tsconfig.json`
- Create: `skills/lucid-trade/tsup.config.ts`
- Create: `skills/lucid-trade/vitest.config.ts`
- Create: `skills/lucid-trade/.prettierrc`

**Step 1: Overwrite package.json with TypeScript MCP config**

```json
{
  "name": "@raijinlabs/trade",
  "version": "5.0.0",
  "description": "Universal Trading MCP — 125+ tools across 7+ exchanges: execution, TA, risk management, backtesting, autonomous trading",
  "type": "module",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "bin": {
    "trade-mcp": "dist/bin.js"
  },
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./mcp": {
      "import": "./dist/mcp.mjs",
      "require": "./dist/mcp.js",
      "types": "./dist/mcp.d.ts"
    }
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "prettier --check .",
    "format": "prettier --write ."
  },
  "keywords": [
    "mcp", "trading", "crypto", "defi", "hyperliquid", "dydx", "gmx",
    "drift", "jupiter", "1inch", "technical-analysis", "backtesting",
    "risk-management", "perps", "web3", "agent-skills"
  ],
  "license": "MIT",
  "author": "RaijinLabs",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.26.0",
    "@supabase/supabase-js": "^2.49.4",
    "zod": "^3.24.4",
    "bottleneck": "^2.19.5",
    "decimal.js": "^10.4.3"
  },
  "devDependencies": {
    "@types/node": "^22.15.21",
    "prettier": "^3.5.3",
    "tsup": "^8.4.0",
    "typescript": "^5.8.3",
    "vitest": "^3.1.3"
  },
  "files": [
    "dist",
    "skills",
    "HEARTBEAT.md",
    "skill.yaml",
    ".claude-plugin",
    "openclaw.plugin.json",
    "README.md",
    "LICENSE"
  ]
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "test"]
}
```

**Step 3: Create tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    mcp: 'src/mcp.ts',
    openclaw: 'src/openclaw.ts',
    bin: 'src/bin.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  shims: true,
  banner: ({ format }) => {
    if (format === 'cjs') {
      return { js: '#!/usr/bin/env node' };
    }
    return {};
  },
});
```

**Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/bin.ts', 'src/index.ts', 'src/openclaw.ts'],
    },
    testTimeout: 10000,
  },
});
```

**Step 5: Create .prettierrc**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

**Step 6: Update .gitignore**

```
node_modules/
dist/
.env
.env.*
*.tsbuildinfo
coverage/
```

**Step 7: Install dependencies**

Run: `cd skills/lucid-trade && npm install`

**Step 8: Commit**

```bash
git add skills/lucid-trade/package.json skills/lucid-trade/tsconfig.json \
  skills/lucid-trade/tsup.config.ts skills/lucid-trade/vitest.config.ts \
  skills/lucid-trade/.prettierrc skills/lucid-trade/.gitignore
git commit -m "feat(trade): scaffold TypeScript MCP package v5"
```

---

### Task 1.2: Core types and exchange adapter interface

**Files:**
- Create: `src/types/common.ts`
- Create: `src/types/market.ts`
- Create: `src/types/trading.ts`
- Create: `src/types/portfolio.ts`
- Create: `src/types/index.ts`
- Create: `src/adapters/types.ts`
- Test: `src/adapters/types.test.ts`

**Step 1: Create common types**

```typescript
// src/types/common.ts
export type ExchangeId =
  | 'hyperliquid'
  | 'dydx'
  | 'gmx'
  | 'drift'
  | 'aevo'
  | 'jupiter'
  | 'oneinch';

export type Chain =
  | 'ethereum'
  | 'solana'
  | 'arbitrum'
  | 'base'
  | 'polygon'
  | 'bsc'
  | 'optimism'
  | 'avalanche';

export type AssetType = 'perp' | 'spot' | 'option';

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop_loss' | 'take_profit' | 'trailing_stop';
export type PositionSide = 'long' | 'short';

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1M';

export interface ExchangeCapability {
  perps: boolean;
  spot: boolean;
  options: boolean;
  leaderboard: boolean;
  mirrorTrading: boolean;
  bridging: boolean;
}
```

**Step 2: Create market data types**

```typescript
// src/types/market.ts
export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Orderbook {
  bids: [price: number, size: number][];
  asks: [price: number, size: number][];
  timestamp: number;
}

export interface FundingRate {
  symbol: string;
  rate: number;
  nextFundingTime: number;
  timestamp: number;
}

export interface OpenInterest {
  symbol: string;
  openInterest: number;
  openInterestUsd: number;
  timestamp: number;
}

export interface Price {
  symbol: string;
  price: number;
  timestamp: number;
}

export interface Instrument {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  assetType: import('./common.js').AssetType;
  maxLeverage: number;
  minSize: number;
  tickSize: number;
  active: boolean;
}

export interface Ticker {
  symbol: string;
  last: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  change24h: number;
  changePct24h: number;
  timestamp: number;
}

export interface Trade {
  id: string;
  symbol: string;
  side: import('./common.js').OrderSide;
  price: number;
  size: number;
  timestamp: number;
}

export interface CandleParams {
  symbol: string;
  timeframe: import('./common.js').Timeframe;
  limit?: number;
  startTime?: number;
  endTime?: number;
}
```

**Step 3: Create trading types**

```typescript
// src/types/trading.ts
import type { OrderSide, OrderType, PositionSide } from './common.js';

export interface Position {
  symbol: string;
  side: PositionSide;
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  leverage: number;
  liquidationPrice: number | null;
  margin: number;
  timestamp: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: number | null;
  size: number;
  filledSize: number;
  status: 'open' | 'partial' | 'filled' | 'cancelled';
  timestamp: number;
}

export interface ClosedTrade {
  id: string;
  symbol: string;
  side: PositionSide;
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  pnlPct: number;
  fees: number;
  entryTime: number;
  exitTime: number;
}

export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
  usdValue: number;
}

export interface OpenPositionParams {
  symbol: string;
  side: PositionSide;
  size: number;
  leverage: number;
  orderType?: OrderType;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  slippage?: number;
}

export interface ClosePositionParams {
  symbol: string;
  size?: number; // partial close if specified
  orderType?: OrderType;
  price?: number;
}

export interface OrderParams {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  size: number;
  price?: number;
  triggerPrice?: number;
}

export interface OrderResult {
  orderId: string;
  symbol: string;
  status: 'submitted' | 'filled' | 'rejected';
  filledPrice?: number;
  filledSize?: number;
  fees?: number;
  txHash?: string;
}

export interface SpotSwapParams {
  fromToken: string;
  toToken: string;
  amount: number;
  slippage?: number;
  chain: import('./common.js').Chain;
}

export interface SwapQuote {
  fromToken: string;
  toToken: string;
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  route: string[];
  estimatedGas: number;
  exchangeId: import('./common.js').ExchangeId;
}
```

**Step 4: Create portfolio types**

```typescript
// src/types/portfolio.ts
export interface PortfolioOverview {
  totalValueUsd: number;
  totalPnl: number;
  totalPnlPct: number;
  positionCount: number;
  positions: import('./trading.js').Position[];
  balances: import('./trading.js').Balance[];
  allocations: AllocationEntry[];
  timestamp: number;
}

export interface AllocationEntry {
  label: string;
  valueUsd: number;
  percentage: number;
}

export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPct: number;
  sharpeRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  profitFactor: number;
  winRate: number;
  totalTrades: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface TraderProfile {
  address: string;
  exchangeId: import('./common.js').ExchangeId;
  pnl: number;
  roi: number;
  winRate: number;
  tradeCount: number;
  maxDrawdown: number;
  sharpeRatio: number;
  labels: string[];
  score: number;
  timeframe: string;
}
```

**Step 5: Create barrel export**

```typescript
// src/types/index.ts
export * from './common.js';
export * from './market.js';
export * from './trading.js';
export * from './portfolio.js';
```

**Step 6: Create adapter interface**

```typescript
// src/adapters/types.ts
import type {
  ExchangeId,
  Chain,
  ExchangeCapability,
  CandleParams,
  OHLCV,
  Orderbook,
  FundingRate,
  OpenInterest,
  Price,
  Instrument,
  Ticker,
  Trade,
  Position,
  Order,
  ClosedTrade,
  Balance,
  OpenPositionParams,
  ClosePositionParams,
  OrderParams,
  OrderResult,
  TraderProfile,
} from '../types/index.js';

/**
 * Unified exchange adapter interface.
 * Every exchange implements a subset of these methods based on capabilities.
 * Market data methods require no auth. Execution methods require credentials.
 */
export interface IExchangeAdapter {
  readonly id: ExchangeId;
  readonly name: string;
  readonly chains: Chain[];
  readonly capabilities: ExchangeCapability;

  // --- Market Data (no auth) ---
  getCandles(params: CandleParams): Promise<OHLCV[]>;
  getOrderbook(symbol: string, depth?: number): Promise<Orderbook>;
  getPrice(symbol: string): Promise<Price>;
  getInstruments(): Promise<Instrument[]>;
  getTicker(symbol: string): Promise<Ticker>;
  getRecentTrades(symbol: string, limit?: number): Promise<Trade[]>;

  // --- Perp-specific (no auth) ---
  getFundingRate?(symbol: string): Promise<FundingRate>;
  getOpenInterest?(symbol: string): Promise<OpenInterest>;

  // --- Trader Discovery (no auth, where available) ---
  getLeaderboard?(params: { timeframe: string; limit?: number }): Promise<TraderProfile[]>;
  getTraderPositions?(address: string): Promise<Position[]>;
  getTraderHistory?(address: string, limit?: number): Promise<ClosedTrade[]>;

  // --- Execution (requires auth) ---
  openPosition?(params: OpenPositionParams): Promise<OrderResult>;
  closePosition?(params: ClosePositionParams): Promise<OrderResult>;
  placeOrder?(params: OrderParams): Promise<OrderResult>;
  cancelOrder?(orderId: string): Promise<void>;
  cancelAllOrders?(symbol?: string): Promise<void>;

  // --- Account (requires auth) ---
  getBalances?(): Promise<Balance[]>;
  getPositions?(): Promise<Position[]>;
  getOrders?(): Promise<Order[]>;
  getTradeHistory?(params?: { limit?: number; startTime?: number }): Promise<ClosedTrade[]>;
}

/**
 * Configuration required to instantiate an adapter.
 * Market data adapters need no credentials.
 * Execution adapters need exchange-specific auth.
 */
export interface AdapterConfig {
  exchangeId: ExchangeId;
  credentials?: Record<string, string>;
  rateLimit?: { maxConcurrent: number; minTime: number };
}
```

**Step 7: Write a type-check test to verify all interfaces compile**

```typescript
// src/adapters/types.test.ts
import { describe, it, expect } from 'vitest';
import type { IExchangeAdapter, AdapterConfig } from './types.js';
import type { ExchangeId, ExchangeCapability } from '../types/index.js';

describe('IExchangeAdapter interface', () => {
  it('should define all required exchange IDs', () => {
    const ids: ExchangeId[] = [
      'hyperliquid', 'dydx', 'gmx', 'drift', 'aevo', 'jupiter', 'oneinch',
    ];
    expect(ids).toHaveLength(7);
  });

  it('should define capability flags', () => {
    const cap: ExchangeCapability = {
      perps: true,
      spot: false,
      options: false,
      leaderboard: true,
      mirrorTrading: true,
      bridging: true,
    };
    expect(cap.perps).toBe(true);
    expect(cap.options).toBe(false);
  });

  it('should accept a valid adapter config', () => {
    const config: AdapterConfig = {
      exchangeId: 'hyperliquid',
      credentials: { privateKey: '0x...' },
      rateLimit: { maxConcurrent: 5, minTime: 200 },
    };
    expect(config.exchangeId).toBe('hyperliquid');
  });
});
```

**Step 8: Run tests**

Run: `cd skills/lucid-trade && npx vitest run src/adapters/types.test.ts`
Expected: 3 passing tests

**Step 9: Commit**

```bash
git add skills/lucid-trade/src/
git commit -m "feat(trade): add core types and IExchangeAdapter interface"
```

---

### Task 1.3: Adapter registry

**Files:**
- Create: `src/adapters/registry.ts`
- Test: `src/adapters/registry.test.ts`

**Step 1: Write failing test**

```typescript
// src/adapters/registry.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AdapterRegistry } from './registry.js';
import type { IExchangeAdapter } from './types.js';

function createMockAdapter(id: string): IExchangeAdapter {
  return {
    id: id as any,
    name: `Mock ${id}`,
    chains: ['ethereum' as const],
    capabilities: {
      perps: true, spot: false, options: false,
      leaderboard: false, mirrorTrading: false, bridging: false,
    },
    getCandles: async () => [],
    getOrderbook: async () => ({ bids: [], asks: [], timestamp: 0 }),
    getPrice: async () => ({ symbol: '', price: 0, timestamp: 0 }),
    getInstruments: async () => [],
    getTicker: async () => ({
      symbol: '', last: 0, high24h: 0, low24h: 0,
      volume24h: 0, change24h: 0, changePct24h: 0, timestamp: 0,
    }),
    getRecentTrades: async () => [],
  };
}

describe('AdapterRegistry', () => {
  let registry: AdapterRegistry;

  beforeEach(() => {
    registry = new AdapterRegistry();
  });

  it('should register and retrieve an adapter', () => {
    const adapter = createMockAdapter('hyperliquid');
    registry.register(adapter);
    expect(registry.get('hyperliquid')).toBe(adapter);
  });

  it('should return undefined for unknown exchange', () => {
    expect(registry.get('hyperliquid')).toBeUndefined();
  });

  it('should list all registered adapters', () => {
    registry.register(createMockAdapter('hyperliquid'));
    registry.register(createMockAdapter('dydx'));
    expect(registry.list()).toHaveLength(2);
  });

  it('should list adapters with specific capability', () => {
    const hl = createMockAdapter('hyperliquid');
    (hl.capabilities as any).leaderboard = true;
    const jup = createMockAdapter('jupiter');
    registry.register(hl);
    registry.register(jup);
    const withLeaderboard = registry.withCapability('leaderboard');
    expect(withLeaderboard).toHaveLength(1);
    expect(withLeaderboard[0]!.id).toBe('hyperliquid');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd skills/lucid-trade && npx vitest run src/adapters/registry.test.ts`
Expected: FAIL — cannot find `./registry.js`

**Step 3: Implement**

```typescript
// src/adapters/registry.ts
import type { ExchangeId, ExchangeCapability } from '../types/index.js';
import type { IExchangeAdapter } from './types.js';

export class AdapterRegistry {
  private adapters = new Map<ExchangeId, IExchangeAdapter>();

  register(adapter: IExchangeAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: ExchangeId): IExchangeAdapter | undefined {
    return this.adapters.get(id);
  }

  list(): IExchangeAdapter[] {
    return [...this.adapters.values()];
  }

  withCapability(cap: keyof ExchangeCapability): IExchangeAdapter[] {
    return this.list().filter((a) => a.capabilities[cap]);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd skills/lucid-trade && npx vitest run src/adapters/registry.test.ts`
Expected: 4 passing tests

**Step 5: Commit**

```bash
git add skills/lucid-trade/src/adapters/
git commit -m "feat(trade): add AdapterRegistry with capability filtering"
```

---

### Task 1.4: Config and plugin identity

**Files:**
- Create: `src/config.ts`
- Create: `src/plugin-id.ts`
- Create: `src/utils/logger.ts`

**Step 1: Create plugin identity**

```typescript
// src/plugin-id.ts
export const PLUGIN_ID = 'lucid-trade';
export const PLUGIN_NAME = 'Lucid Trade';
export const PLUGIN_VERSION = '5.0.0';
```

**Step 2: Create config loader with Zod**

```typescript
// src/config.ts
import { z } from 'zod';

const configSchema = z.object({
  supabaseUrl: z.string().url().optional(),
  supabaseKey: z.string().optional(),

  // Exchange credentials (all optional — market data works without auth)
  hyperliquidPrivateKey: z.string().optional(),
  hyperliquidWalletAddress: z.string().optional(),
  dydxMnemonic: z.string().optional(),
  driftPrivateKey: z.string().optional(),
  gmxPrivateKey: z.string().optional(),
  aevoApiKey: z.string().optional(),
  aevoApiSecret: z.string().optional(),
  jupiterApiKey: z.string().optional(),
  oneinchApiKey: z.string().optional(),
  birdeyeApiKey: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  return configSchema.parse({
    supabaseUrl: env.SUPABASE_URL,
    supabaseKey: env.SUPABASE_SERVICE_KEY,
    hyperliquidPrivateKey: env.HYPERLIQUID_PRIVATE_KEY,
    hyperliquidWalletAddress: env.HYPERLIQUID_WALLET_ADDRESS,
    dydxMnemonic: env.DYDX_MNEMONIC,
    driftPrivateKey: env.DRIFT_PRIVATE_KEY,
    gmxPrivateKey: env.GMX_PRIVATE_KEY,
    aevoApiKey: env.AEVO_API_KEY,
    aevoApiSecret: env.AEVO_API_SECRET,
    jupiterApiKey: env.JUPITER_API_KEY,
    oneinchApiKey: env.ONEINCH_API_KEY,
    birdeyeApiKey: env.BIRDEYE_API_KEY,
  });
}
```

**Step 3: Create logger**

```typescript
// src/utils/logger.ts
export const log = {
  info: (msg: string) => console.error(`[lucid-trade] ${msg}`),
  warn: (msg: string) => console.error(`[lucid-trade] WARN: ${msg}`),
  error: (msg: string, err?: unknown) => console.error(`[lucid-trade] ERROR: ${msg}`, err ?? ''),
};
```

**Step 4: Commit**

```bash
git add skills/lucid-trade/src/config.ts skills/lucid-trade/src/plugin-id.ts \
  skills/lucid-trade/src/utils/
git commit -m "feat(trade): add config loader, plugin identity, logger"
```

---

### Task 1.5: MCP server shell + bin entry point

**Files:**
- Create: `src/bin.ts`
- Create: `src/mcp.ts`
- Create: `src/openclaw.ts`
- Create: `src/index.ts`
- Create: `src/tools/index.ts`

**Step 1: Create tool interface and barrel**

```typescript
// src/tools/index.ts
import { z } from 'zod';

export interface ToolDefinition {
  name: string;
  description: string;
  params: z.ZodObject<any>;
  execute: (params: Record<string, unknown>) => Promise<string>;
}

export function createAllTools(_deps: { registry: import('../adapters/registry.js').AdapterRegistry }): ToolDefinition[] {
  // Tools will be added phase by phase
  return [];
}
```

**Step 2: Create MCP server factory**

```typescript
// src/mcp.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from './config.js';
import { AdapterRegistry } from './adapters/registry.js';
import { createAllTools } from './tools/index.js';
import { PLUGIN_NAME, PLUGIN_VERSION } from './plugin-id.js';
import { log } from './utils/logger.js';

export function createTradeServer(
  env: Record<string, string | undefined> = process.env,
): McpServer {
  const config = loadConfig(env);
  const registry = new AdapterRegistry();

  // Adapters will be registered here as they're built
  // e.g.: registry.register(createHyperliquidAdapter(config));

  const tools = createAllTools({ registry });

  const server = new McpServer({
    name: PLUGIN_NAME,
    version: PLUGIN_VERSION,
  });

  for (const tool of tools) {
    server.tool(
      tool.name,
      tool.description,
      tool.params.shape,
      async (params: Record<string, unknown>) => {
        const result = await tool.execute(params);
        return { content: [{ type: 'text' as const, text: result }] };
      },
    );
  }

  log.info(`${PLUGIN_NAME} v${PLUGIN_VERSION} MCP server created (${tools.length} tools)`);
  return server;
}
```

**Step 3: Create bin entry**

```typescript
// src/bin.ts
#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createTradeServer } from './mcp.js';

async function main(): Promise<void> {
  const server = createTradeServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

**Step 4: Create openclaw entry**

```typescript
// src/openclaw.ts
import { loadConfig } from './config.js';
import { AdapterRegistry } from './adapters/registry.js';
import { createAllTools } from './tools/index.js';
import { PLUGIN_ID, PLUGIN_NAME, PLUGIN_VERSION } from './plugin-id.js';
import { log } from './utils/logger.js';

export default function register(api: any): void {
  const config = loadConfig();
  const registry = new AdapterRegistry();

  const tools = createAllTools({ registry });

  for (const tool of tools) {
    api.registerTool({
      id: `${PLUGIN_ID}:${tool.name}`,
      name: tool.name,
      description: tool.description,
      parameters: tool.params,
      execute: async (params: Record<string, unknown>) => {
        return await tool.execute(params);
      },
    });
  }

  log.info(`${PLUGIN_NAME} v${PLUGIN_VERSION} registered (${tools.length} tools)`);
}
```

**Step 5: Create index barrel**

```typescript
// src/index.ts
export { default } from './openclaw.js';
export { createTradeServer } from './mcp.js';
export type { IExchangeAdapter, AdapterConfig } from './adapters/types.js';
export type { ToolDefinition } from './tools/index.js';
export * from './types/index.js';
```

**Step 6: Build to verify compilation**

Run: `cd skills/lucid-trade && npx tsup`
Expected: Clean build producing dist/bin.js, dist/mcp.js, dist/index.js, dist/openclaw.js

**Step 7: Commit**

```bash
git add skills/lucid-trade/src/
git commit -m "feat(trade): add MCP server shell, bin entry, OpenClaw plugin"
```

---

## Phase 2: Intelligence Layer (Our Moat)

This is what Senpi doesn't have and can't easily replicate. We port our v4 AgentSkills formulas into executable TypeScript.

### Task 2.1: Technical Analysis engine — indicators

**Files:**
- Create: `src/intelligence/indicators.ts`
- Test: `src/intelligence/indicators.test.ts`

Port ALL indicator formulas from `skills/market-analysis/references/indicators.md` into TypeScript functions. Each function takes a number array and returns computed values.

**Step 1: Write failing tests for SMA**

```typescript
// src/intelligence/indicators.test.ts
import { describe, it, expect } from 'vitest';
import { sma, ema, rsi, macd, bollingerBands, atr, historicalVolatility } from './indicators.js';

describe('sma', () => {
  it('should compute simple moving average', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = sma(data, 3);
    // SMA(3) of [1,2,3,4,5,...,10]:
    // [2, 3, 4, 5, 6, 7, 8, 9]
    expect(result).toHaveLength(8);
    expect(result[0]).toBeCloseTo(2); // (1+2+3)/3
    expect(result[7]).toBeCloseTo(9); // (8+9+10)/3
  });

  it('should return empty for insufficient data', () => {
    expect(sma([1, 2], 5)).toHaveLength(0);
  });
});

describe('ema', () => {
  it('should compute exponential moving average', () => {
    const data = [22, 22.27, 22.19, 22.08, 22.17, 22.18, 22.13, 22.23, 22.43, 22.24, 22.29];
    const result = ema(data, 5);
    expect(result.length).toBeGreaterThan(0);
    // EMA seeded with SMA of first 5 values
    const seedSma = (22 + 22.27 + 22.19 + 22.08 + 22.17) / 5;
    expect(result[0]).toBeCloseTo(seedSma, 2);
  });
});

describe('rsi', () => {
  it('should compute RSI with Wilder smoothing', () => {
    // A trending-up series should have RSI > 50
    const uptrend = Array.from({ length: 20 }, (_, i) => 100 + i * 2);
    const result = rsi(uptrend, 14);
    expect(result.length).toBeGreaterThan(0);
    expect(result[result.length - 1]!).toBeGreaterThan(50);
  });

  it('should compute RSI < 30 for downtrend', () => {
    const downtrend = Array.from({ length: 30 }, (_, i) => 100 - i * 2);
    const result = rsi(downtrend, 14);
    expect(result[result.length - 1]!).toBeLessThan(30);
  });

  it('should return 100 when no losses', () => {
    const allUp = Array.from({ length: 20 }, (_, i) => 100 + i);
    const result = rsi(allUp, 14);
    expect(result[result.length - 1]!).toBeCloseTo(100);
  });
});

describe('macd', () => {
  it('should return macdLine, signalLine, histogram arrays', () => {
    const data = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 10);
    const result = macd(data);
    expect(result.macdLine.length).toBeGreaterThan(0);
    expect(result.signalLine.length).toBeGreaterThan(0);
    expect(result.histogram.length).toBe(result.macdLine.length);
  });
});

describe('bollingerBands', () => {
  it('should return upper, middle, lower bands', () => {
    const data = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i / 3) * 5);
    const result = bollingerBands(data, 20, 2);
    expect(result.upper.length).toBe(result.middle.length);
    expect(result.lower.length).toBe(result.middle.length);
    // Upper > middle > lower always
    for (let i = 0; i < result.middle.length; i++) {
      expect(result.upper[i]!).toBeGreaterThanOrEqual(result.middle[i]!);
      expect(result.middle[i]!).toBeGreaterThanOrEqual(result.lower[i]!);
    }
  });
});

describe('atr', () => {
  it('should compute average true range from OHLC', () => {
    const highs = [11, 12, 13, 12, 14, 15, 13, 14, 15, 16, 14, 15, 16, 17, 15, 16];
    const lows = [9, 10, 11, 10, 12, 13, 11, 12, 13, 14, 12, 13, 14, 15, 13, 14];
    const closes = [10, 11, 12, 11, 13, 14, 12, 13, 14, 15, 13, 14, 15, 16, 14, 15];
    const result = atr(highs, lows, closes, 14);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]!).toBeGreaterThan(0);
  });
});

describe('historicalVolatility', () => {
  it('should compute annualized volatility', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i / 3) * 5);
    const vol = historicalVolatility(closes, 20);
    expect(vol).toBeGreaterThan(0);
  });
});
```

**Step 2: Run to verify all fail**

Run: `cd skills/lucid-trade && npx vitest run src/intelligence/indicators.test.ts`
Expected: FAIL — module not found

**Step 3: Implement all indicators (ported from skills/market-analysis/references/indicators.md)**

```typescript
// src/intelligence/indicators.ts

/** Simple Moving Average */
export function sma(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const result: number[] = [];
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j]!;
    result.push(sum / period);
  }
  return result;
}

/** Exponential Moving Average — seeded with SMA of first `period` values */
export function ema(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];
  // Seed with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i]!;
  result.push(sum / period);
  // EMA from there
  for (let i = period; i < values.length; i++) {
    result.push(values[i]! * k + result[result.length - 1]! * (1 - k));
  }
  return result;
}

/** RSI with Wilder smoothing. Default period: 14. */
export function rsi(closes: number[], period = 14): number[] {
  if (closes.length < period + 1) return [];
  const deltas: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    deltas.push(closes[i]! - closes[i - 1]!);
  }

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    const d = deltas[i]!;
    if (d > 0) avgGain += d;
    else avgLoss += Math.abs(d);
  }
  avgGain /= period;
  avgLoss /= period;

  const result: number[] = [];
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period; i < deltas.length; i++) {
    const d = deltas[i]!;
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? Math.abs(d) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

/** MACD(12, 26, 9). Returns macdLine, signalLine, histogram. */
export function macd(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): { macdLine: number[]; signalLine: number[]; histogram: number[] } {
  const fastEma = ema(closes, fastPeriod);
  const slowEma = ema(closes, slowPeriod);
  const offset = slowPeriod - fastPeriod;

  const macdLine: number[] = [];
  for (let i = 0; i < slowEma.length; i++) {
    macdLine.push(fastEma[i + offset]! - slowEma[i]!);
  }

  const signalLine = ema(macdLine, signalPeriod);
  const sigOffset = signalPeriod - 1;

  const histogram: number[] = [];
  const alignedMacd: number[] = [];
  for (let i = 0; i < signalLine.length; i++) {
    const m = macdLine[i + sigOffset]!;
    alignedMacd.push(m);
    histogram.push(m - signalLine[i]!);
  }

  return { macdLine: alignedMacd, signalLine, histogram };
}

/** Bollinger Bands(period, stdDevMultiplier). Returns upper, middle, lower. */
export function bollingerBands(
  closes: number[],
  period = 20,
  stdDev = 2,
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = sma(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < middle.length; i++) {
    const windowStart = i; // sma already aligns
    let variance = 0;
    for (let j = 0; j < period; j++) {
      const diff = closes[windowStart + j]! - middle[i]!;
      variance += diff * diff;
    }
    const sd = Math.sqrt(variance / period);
    upper.push(middle[i]! + stdDev * sd);
    lower.push(middle[i]! - stdDev * sd);
  }

  return { upper, middle, lower };
}

/** Average True Range with Wilder smoothing. */
export function atr(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): number[] {
  if (highs.length < period + 1) return [];

  const trueRanges: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i]! - lows[i]!,
      Math.abs(highs[i]! - closes[i - 1]!),
      Math.abs(lows[i]! - closes[i - 1]!),
    );
    trueRanges.push(tr);
  }

  // Seed with SMA of first `period` true ranges
  let sum = 0;
  for (let i = 0; i < period; i++) sum += trueRanges[i]!;
  const result: number[] = [sum / period];

  // Wilder smoothing
  for (let i = period; i < trueRanges.length; i++) {
    result.push((result[result.length - 1]! * (period - 1) + trueRanges[i]!) / period);
  }
  return result;
}

/** Historical volatility (annualized, 365 days for crypto). */
export function historicalVolatility(closes: number[], lookback = 20): number {
  if (closes.length < lookback + 1) return 0;
  const logReturns: number[] = [];
  const start = closes.length - lookback - 1;
  for (let i = start + 1; i < closes.length; i++) {
    logReturns.push(Math.log(closes[i]! / closes[i - 1]!));
  }
  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance = logReturns.reduce((a, r) => a + (r - mean) ** 2, 0) / logReturns.length;
  return Math.sqrt(variance * 365) * 100;
}
```

**Step 4: Run tests**

Run: `cd skills/lucid-trade && npx vitest run src/intelligence/indicators.test.ts`
Expected: All tests pass

**Step 5: Commit**

```bash
git add skills/lucid-trade/src/intelligence/
git commit -m "feat(trade): add TA indicators — SMA, EMA, RSI, MACD, Bollinger, ATR, HV"
```

---

### Task 2.2: Technical Analysis engine — trend detection and support/resistance

**Files:**
- Create: `src/intelligence/trend.ts`
- Test: `src/intelligence/trend.test.ts`

**Step 1: Write failing tests**

```typescript
// src/intelligence/trend.test.ts
import { describe, it, expect } from 'vitest';
import { detectTrend, findSupportResistance, classifyVolatilityRegime } from './trend.js';
import type { OHLCV } from '../types/index.js';

describe('detectTrend', () => {
  it('should detect uptrend when price > SMA20 > SMA50', () => {
    // Steadily rising prices
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i * 2);
    const result = detectTrend(closes);
    expect(result.trend).toMatch(/uptrend/i);
  });

  it('should detect downtrend when price < SMA20 < SMA50', () => {
    const closes = Array.from({ length: 60 }, (_, i) => 200 - i * 2);
    const result = detectTrend(closes);
    expect(result.trend).toMatch(/downtrend/i);
  });
});

describe('findSupportResistance', () => {
  it('should find swing highs and lows', () => {
    // Create a series with clear peaks and valleys
    const bars: OHLCV[] = Array.from({ length: 50 }, (_, i) => ({
      timestamp: i,
      open: 100 + Math.sin(i / 5) * 10,
      high: 100 + Math.sin(i / 5) * 10 + 2,
      low: 100 + Math.sin(i / 5) * 10 - 2,
      close: 100 + Math.sin(i / 5) * 10,
      volume: 1000,
    }));
    const result = findSupportResistance(bars);
    expect(result.supports.length).toBeGreaterThan(0);
    expect(result.resistances.length).toBeGreaterThan(0);
  });
});

describe('classifyVolatilityRegime', () => {
  it('should classify low volatility', () => {
    expect(classifyVolatilityRegime(15)).toBe('low');
  });
  it('should classify moderate volatility', () => {
    expect(classifyVolatilityRegime(45)).toBe('moderate');
  });
  it('should classify high volatility', () => {
    expect(classifyVolatilityRegime(80)).toBe('high');
  });
  it('should classify extreme volatility', () => {
    expect(classifyVolatilityRegime(120)).toBe('extreme');
  });
});
```

**Step 2: Run to verify fail**

Run: `cd skills/lucid-trade && npx vitest run src/intelligence/trend.test.ts`

**Step 3: Implement**

```typescript
// src/intelligence/trend.ts
import { sma } from './indicators.js';
import type { OHLCV } from '../types/index.js';

export type TrendType = 'strong_uptrend' | 'uptrend' | 'sideways' | 'downtrend' | 'strong_downtrend';
export type VolatilityRegime = 'low' | 'moderate' | 'high' | 'extreme';

export function detectTrend(
  closes: number[],
  fastPeriod = 20,
  slowPeriod = 50,
): { trend: TrendType; pctAboveFast: number } {
  if (closes.length < slowPeriod) return { trend: 'sideways', pctAboveFast: 0 };

  const fastSma = sma(closes, fastPeriod);
  const slowSma = sma(closes, slowPeriod);
  const offset = slowPeriod - fastPeriod;

  const price = closes[closes.length - 1]!;
  const fast = fastSma[fastSma.length - 1]!;
  const slow = slowSma[slowSma.length - 1]!;
  const pctAbove = ((price - fast) / fast) * 100;

  if (price > fast && fast > slow) {
    return { trend: pctAbove > 5 ? 'strong_uptrend' : 'uptrend', pctAboveFast: pctAbove };
  }
  if (price < fast && fast < slow) {
    return { trend: pctAbove < -5 ? 'strong_downtrend' : 'downtrend', pctAboveFast: pctAbove };
  }
  return { trend: 'sideways', pctAboveFast: pctAbove };
}

export function findSupportResistance(
  bars: OHLCV[],
  lookback = 2,
): { supports: number[]; resistances: number[] } {
  const supports: number[] = [];
  const resistances: number[] = [];

  for (let i = lookback; i < bars.length - lookback; i++) {
    const bar = bars[i]!;
    let isSwingLow = true;
    let isSwingHigh = true;

    for (let j = 1; j <= lookback; j++) {
      if (bar.low >= bars[i - j]!.low || bar.low >= bars[i + j]!.low) isSwingLow = false;
      if (bar.high <= bars[i - j]!.high || bar.high <= bars[i + j]!.high) isSwingHigh = false;
    }

    if (isSwingLow) supports.push(bar.low);
    if (isSwingHigh) resistances.push(bar.high);
  }

  supports.sort((a, b) => b - a); // descending (strongest first)
  resistances.sort((a, b) => a - b); // ascending (nearest first)
  return { supports, resistances };
}

export function classifyVolatilityRegime(historicalVol: number): VolatilityRegime {
  if (historicalVol < 30) return 'low';
  if (historicalVol < 60) return 'moderate';
  if (historicalVol < 100) return 'high';
  return 'extreme';
}

export function volatilityMultiplier(regime: VolatilityRegime): number {
  switch (regime) {
    case 'low': return 1.0;
    case 'moderate': return 1.0;
    case 'high': return 0.5;
    case 'extreme': return 0.25;
  }
}
```

**Step 4: Run tests**

Run: `cd skills/lucid-trade && npx vitest run src/intelligence/trend.test.ts`
Expected: All pass

**Step 5: Commit**

```bash
git add skills/lucid-trade/src/intelligence/trend.ts skills/lucid-trade/src/intelligence/trend.test.ts
git commit -m "feat(trade): add trend detection, S/R levels, volatility regime classification"
```

---

### Task 2.3: Risk engine — position sizing

**Files:**
- Create: `src/intelligence/risk-engine.ts`
- Test: `src/intelligence/risk-engine.test.ts`

**Step 1: Write failing tests**

```typescript
// src/intelligence/risk-engine.test.ts
import { describe, it, expect } from 'vitest';
import {
  fixedPercentageSize,
  kellyCriterionSize,
  calculateRiskReward,
  calculateLiquidationPrice,
} from './risk-engine.js';

describe('fixedPercentageSize', () => {
  it('should calculate position size from risk amount and stop distance', () => {
    // Portfolio $50,000, risk 2%, entry $100, stop $95
    const result = fixedPercentageSize({
      portfolioValue: 50000,
      riskPerTrade: 2,
      entryPrice: 100,
      stopLossPrice: 95,
      maxPositionPct: 10,
    });
    expect(result.riskAmount).toBe(1000); // 50000 * 0.02
    expect(result.positionSizeUnits).toBeCloseTo(200); // 1000 / 5
    expect(result.positionValue).toBeCloseTo(5000); // Capped at 10% of 50k
    expect(result.capped).toBe(true);
    expect(result.cappedUnits).toBeCloseTo(50); // 5000 / 100
  });

  it('should not cap when position value is within limit', () => {
    const result = fixedPercentageSize({
      portfolioValue: 50000,
      riskPerTrade: 1,
      entryPrice: 100,
      stopLossPrice: 90,
      maxPositionPct: 50,
    });
    expect(result.capped).toBe(false);
  });
});

describe('kellyCriterionSize', () => {
  it('should compute half-kelly position size', () => {
    const result = kellyCriterionSize({
      portfolioValue: 10000,
      winRate: 0.55,
      avgWinPct: 3,
      avgLossPct: 2,
    });
    expect(result.kellyFraction).toBeGreaterThan(0);
    expect(result.halfKelly).toBe(result.kellyFraction / 2);
    expect(result.positionValue).toBe(result.halfKelly * 10000);
  });

  it('should return 0 for negative kelly', () => {
    const result = kellyCriterionSize({
      portfolioValue: 10000,
      winRate: 0.3,
      avgWinPct: 1,
      avgLossPct: 5,
    });
    expect(result.halfKelly).toBe(0);
    expect(result.positionValue).toBe(0);
  });
});

describe('calculateRiskReward', () => {
  it('should compute risk/reward ratio', () => {
    const result = calculateRiskReward({
      entryPrice: 100,
      stopLossPrice: 95,
      takeProfitPrice: 115,
    });
    expect(result.risk).toBe(5);
    expect(result.reward).toBe(15);
    expect(result.ratio).toBe(3); // 15/5 = 3:1
    expect(result.rating).toBe('excellent');
  });

  it('should rate poor for sub-1:1', () => {
    const result = calculateRiskReward({
      entryPrice: 100,
      stopLossPrice: 90,
      takeProfitPrice: 105,
    });
    expect(result.ratio).toBe(0.5);
    expect(result.rating).toBe('poor');
  });
});

describe('calculateLiquidationPrice', () => {
  it('should compute liquidation for long', () => {
    const liq = calculateLiquidationPrice({
      entryPrice: 100,
      leverage: 10,
      side: 'long',
      maintenanceMargin: 0.5,
    });
    // Approx: entry * (1 - 1/leverage + maintenance)
    expect(liq).toBeLessThan(100);
    expect(liq).toBeGreaterThan(85);
  });

  it('should compute liquidation for short', () => {
    const liq = calculateLiquidationPrice({
      entryPrice: 100,
      leverage: 10,
      side: 'short',
      maintenanceMargin: 0.5,
    });
    expect(liq).toBeGreaterThan(100);
    expect(liq).toBeLessThan(115);
  });
});
```

**Step 2: Run to verify fail**

Run: `cd skills/lucid-trade && npx vitest run src/intelligence/risk-engine.test.ts`

**Step 3: Implement**

```typescript
// src/intelligence/risk-engine.ts
import type { PositionSide } from '../types/index.js';

export interface FixedPercentageParams {
  portfolioValue: number;
  riskPerTrade: number; // percentage (e.g. 2 = 2%)
  entryPrice: number;
  stopLossPrice: number;
  maxPositionPct: number; // percentage (e.g. 10 = 10%)
}

export interface FixedPercentageResult {
  riskAmount: number;
  stopLossDistance: number;
  stopLossDistancePct: number;
  positionSizeUnits: number;
  positionValue: number;
  capped: boolean;
  cappedUnits: number;
}

export function fixedPercentageSize(params: FixedPercentageParams): FixedPercentageResult {
  const riskAmount = params.portfolioValue * (params.riskPerTrade / 100);
  const stopLossDistance = Math.abs(params.entryPrice - params.stopLossPrice);
  const stopLossDistancePct = (stopLossDistance / params.entryPrice) * 100;
  const positionSizeUnits = riskAmount / stopLossDistance;
  const positionValue = positionSizeUnits * params.entryPrice;
  const maxAllowed = params.portfolioValue * (params.maxPositionPct / 100);
  const capped = positionValue > maxAllowed;

  return {
    riskAmount,
    stopLossDistance,
    stopLossDistancePct,
    positionSizeUnits,
    positionValue: capped ? maxAllowed : positionValue,
    capped,
    cappedUnits: capped ? maxAllowed / params.entryPrice : positionSizeUnits,
  };
}

export interface KellyParams {
  portfolioValue: number;
  winRate: number; // 0-1
  avgWinPct: number;
  avgLossPct: number;
}

export interface KellyResult {
  kellyFraction: number;
  halfKelly: number;
  positionValue: number;
}

export function kellyCriterionSize(params: KellyParams): KellyResult {
  const kelly =
    (params.winRate * params.avgWinPct - (1 - params.winRate) * params.avgLossPct) /
    params.avgWinPct;
  const halfKelly = Math.max(0, kelly / 2);
  return {
    kellyFraction: kelly,
    halfKelly,
    positionValue: params.portfolioValue * halfKelly,
  };
}

export interface RiskRewardParams {
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
}

export interface RiskRewardResult {
  risk: number;
  reward: number;
  ratio: number;
  rating: 'excellent' | 'good' | 'acceptable' | 'poor';
}

export function calculateRiskReward(params: RiskRewardParams): RiskRewardResult {
  const risk = Math.abs(params.entryPrice - params.stopLossPrice);
  const reward = Math.abs(params.takeProfitPrice - params.entryPrice);
  const ratio = risk === 0 ? 0 : reward / risk;

  let rating: RiskRewardResult['rating'];
  if (ratio >= 3) rating = 'excellent';
  else if (ratio >= 2) rating = 'good';
  else if (ratio >= 1) rating = 'acceptable';
  else rating = 'poor';

  return { risk, reward, ratio, rating };
}

export function calculateLiquidationPrice(params: {
  entryPrice: number;
  leverage: number;
  side: PositionSide;
  maintenanceMargin?: number; // percentage, default 0.5%
}): number {
  const mm = (params.maintenanceMargin ?? 0.5) / 100;
  if (params.side === 'long') {
    return params.entryPrice * (1 - 1 / params.leverage + mm);
  }
  return params.entryPrice * (1 + 1 / params.leverage - mm);
}
```

**Step 4: Run tests**

Run: `cd skills/lucid-trade && npx vitest run src/intelligence/risk-engine.test.ts`
Expected: All pass

**Step 5: Commit**

```bash
git add skills/lucid-trade/src/intelligence/risk-engine.ts \
  skills/lucid-trade/src/intelligence/risk-engine.test.ts
git commit -m "feat(trade): add risk engine — fixed-%, Kelly, R:R, liquidation price"
```

---

### Task 2.4: Backtesting engine

**Files:**
- Create: `src/intelligence/backtester.ts`
- Test: `src/intelligence/backtester.test.ts`

**Step 1: Write failing tests**

```typescript
// src/intelligence/backtester.test.ts
import { describe, it, expect } from 'vitest';
import { backtestSmaCrossover, backtestRsi, buildBacktestResult } from './backtester.js';
import type { OHLCV } from '../types/index.js';

function generateTrendingBars(count: number, startPrice: number, trend: number): OHLCV[] {
  return Array.from({ length: count }, (_, i) => {
    const base = startPrice + trend * i + Math.sin(i / 10) * 5;
    return {
      timestamp: Date.now() + i * 3600000,
      open: base - 1,
      high: base + 2,
      low: base - 2,
      close: base,
      volume: 1000 + Math.random() * 500,
    };
  });
}

describe('backtestSmaCrossover', () => {
  it('should produce trades on trending data', () => {
    const bars = generateTrendingBars(200, 100, 0.5);
    const result = backtestSmaCrossover(bars, 10, 30);
    expect(result.totalTrades).toBeGreaterThan(0);
    expect(result.trades.length).toBe(result.totalTrades);
  });

  it('should return zero trades for insufficient data', () => {
    const bars = generateTrendingBars(10, 100, 0.5);
    const result = backtestSmaCrossover(bars, 10, 30);
    expect(result.totalTrades).toBe(0);
  });
});

describe('backtestRsi', () => {
  it('should produce trades on oscillating data', () => {
    // Create oscillating data that crosses RSI thresholds
    const bars: OHLCV[] = Array.from({ length: 200 }, (_, i) => {
      const base = 100 + Math.sin(i / 8) * 20;
      return {
        timestamp: Date.now() + i * 3600000,
        open: base, high: base + 2, low: base - 2, close: base, volume: 1000,
      };
    });
    const result = backtestRsi(bars);
    expect(result.totalTrades).toBeGreaterThan(0);
  });
});

describe('buildBacktestResult', () => {
  it('should compute metrics from trades', () => {
    const trades = [
      { entryPrice: 100, exitPrice: 110, pnl: 10, pnlPct: 10, entryTime: 0, exitTime: 1 },
      { entryPrice: 110, exitPrice: 105, pnl: -5, pnlPct: -4.55, entryTime: 2, exitTime: 3 },
      { entryPrice: 105, exitPrice: 120, pnl: 15, pnlPct: 14.29, entryTime: 4, exitTime: 5 },
    ];
    const result = buildBacktestResult(trades);
    expect(result.totalTrades).toBe(3);
    expect(result.winRate).toBeCloseTo(66.67, 0);
    expect(result.profitFactor).toBeGreaterThan(1);
    expect(result.totalReturnPct).toBeGreaterThan(0);
    expect(result.maxDrawdownPct).toBeGreaterThanOrEqual(0);
  });
});
```

**Step 2: Run to verify fail**

Run: `cd skills/lucid-trade && npx vitest run src/intelligence/backtester.test.ts`

**Step 3: Implement (ported from skills/backtesting/references/strategies.md)**

```typescript
// src/intelligence/backtester.ts
import { sma, rsi } from './indicators.js';
import type { OHLCV } from '../types/index.js';

export interface BacktestTrade {
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPct: number;
  entryTime: number;
  exitTime: number;
}

export interface BacktestResult {
  totalReturnPct: number;
  finalEquity: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  trades: BacktestTrade[];
}

export function backtestSmaCrossover(
  bars: OHLCV[],
  fastPeriod = 10,
  slowPeriod = 30,
): BacktestResult {
  const closes = bars.map((b) => b.close);
  if (closes.length < slowPeriod + 1) return emptyResult();

  const fastSma = sma(closes, fastPeriod);
  const slowSma = sma(closes, slowPeriod);
  const offset = slowPeriod - fastPeriod;

  const trades: BacktestTrade[] = [];
  let position: { entryPrice: number; entryTime: number } | null = null;

  for (let i = 1; i < slowSma.length; i++) {
    const prevFast = fastSma[i - 1 + offset]!;
    const prevSlow = slowSma[i - 1]!;
    const currFast = fastSma[i + offset]!;
    const currSlow = slowSma[i]!;
    const barIdx = i + slowPeriod - 1;
    const bar = bars[barIdx]!;

    // Golden cross: BUY
    if (prevFast <= prevSlow && currFast > currSlow && !position) {
      position = { entryPrice: bar.close, entryTime: bar.timestamp };
    }
    // Death cross: SELL
    if (prevFast >= prevSlow && currFast < currSlow && position) {
      const pnl = bar.close - position.entryPrice;
      trades.push({
        entryPrice: position.entryPrice,
        exitPrice: bar.close,
        pnl,
        pnlPct: (pnl / position.entryPrice) * 100,
        entryTime: position.entryTime,
        exitTime: bar.timestamp,
      });
      position = null;
    }
  }

  return buildBacktestResult(trades);
}

export function backtestRsi(
  bars: OHLCV[],
  period = 14,
  oversold = 30,
  overbought = 70,
): BacktestResult {
  const closes = bars.map((b) => b.close);
  const rsiValues = rsi(closes, period);
  if (rsiValues.length < 2) return emptyResult();

  const trades: BacktestTrade[] = [];
  let position: { entryPrice: number; entryTime: number } | null = null;

  for (let i = 1; i < rsiValues.length; i++) {
    const barIdx = i + period;
    if (barIdx >= bars.length) break;
    const bar = bars[barIdx]!;
    const prevRsi = rsiValues[i - 1]!;
    const currRsi = rsiValues[i]!;

    // RSI crosses above oversold → BUY
    if (prevRsi <= oversold && currRsi > oversold && !position) {
      position = { entryPrice: bar.close, entryTime: bar.timestamp };
    }
    // RSI crosses above overbought → SELL
    if (prevRsi <= overbought && currRsi > overbought && position) {
      const pnl = bar.close - position.entryPrice;
      trades.push({
        entryPrice: position.entryPrice,
        exitPrice: bar.close,
        pnl,
        pnlPct: (pnl / position.entryPrice) * 100,
        entryTime: position.entryTime,
        exitTime: bar.timestamp,
      });
      position = null;
    }
  }

  return buildBacktestResult(trades);
}

export function buildBacktestResult(
  trades: Pick<BacktestTrade, 'pnl' | 'pnlPct' | 'entryPrice' | 'exitPrice' | 'entryTime' | 'exitTime'>[],
  startingEquity = 10000,
): BacktestResult {
  if (trades.length === 0) return emptyResult();

  // Equity curve
  let equity = startingEquity;
  const equitySeries = [equity];
  const returns: number[] = [];

  for (const t of trades) {
    returns.push(t.pnlPct / 100);
    equity = equity * (1 + t.pnlPct / 100);
    equitySeries.push(equity);
  }

  const totalReturnPct = ((equity - startingEquity) / startingEquity) * 100;

  // Max drawdown
  let peak = equitySeries[0]!;
  let maxDd = 0;
  for (const v of equitySeries) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDd) maxDd = dd;
  }

  // Sharpe
  let sharpe = 0;
  if (returns.length >= 2) {
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev > 0) sharpe = (mean * 365) / (stdDev * Math.sqrt(365));
  }

  // Win rate
  const winners = trades.filter((t) => t.pnl > 0).length;
  const winRate = (winners / trades.length) * 100;

  // Profit factor
  const grossProfit = trades.filter((t) => t.pnl > 0).reduce((a, t) => a + t.pnl, 0);
  const grossLoss = trades.filter((t) => t.pnl < 0).reduce((a, t) => a + Math.abs(t.pnl), 0);
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  return {
    totalReturnPct,
    finalEquity: equity,
    sharpeRatio: sharpe,
    maxDrawdownPct: maxDd * 100,
    winRate,
    profitFactor,
    totalTrades: trades.length,
    trades: trades as BacktestTrade[],
  };
}

function emptyResult(): BacktestResult {
  return {
    totalReturnPct: 0, finalEquity: 10000, sharpeRatio: 0,
    maxDrawdownPct: 0, winRate: 0, profitFactor: 0, totalTrades: 0, trades: [],
  };
}
```

**Step 4: Run tests**

Run: `cd skills/lucid-trade && npx vitest run src/intelligence/backtester.test.ts`
Expected: All pass

**Step 5: Create intelligence barrel export**

```typescript
// src/intelligence/index.ts
export * from './indicators.js';
export * from './trend.js';
export * from './risk-engine.js';
export * from './backtester.js';
```

**Step 6: Commit**

```bash
git add skills/lucid-trade/src/intelligence/
git commit -m "feat(trade): add backtesting engine — SMA crossover, RSI mean-reversion"
```

---

## Phase 3: First MCP Tools — Technical Analysis & Market Data

### Task 3.1: TA tools (10 tools)

**Files:**
- Create: `src/tools/technical-analysis.ts`
- Test: `src/tools/technical-analysis.test.ts`

This task registers 10 MCP tools that wrap the intelligence layer. Each tool:
1. Takes exchange + symbol + optional params via Zod schema
2. Fetches candles from the adapter
3. Runs indicator computation
4. Returns formatted JSON string

**Step 1: Write failing test for ta_analyze**

```typescript
// src/tools/technical-analysis.test.ts
import { describe, it, expect } from 'vitest';
import { createTaTools } from './technical-analysis.js';
import { AdapterRegistry } from '../adapters/registry.js';
import type { IExchangeAdapter, OHLCV } from '../types/index.js';

function mockBars(count: number): OHLCV[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: Date.now() + i * 3600000,
    open: 100 + Math.sin(i / 8) * 10,
    high: 100 + Math.sin(i / 8) * 10 + 3,
    low: 100 + Math.sin(i / 8) * 10 - 3,
    close: 100 + Math.sin(i / 8) * 10 + 1,
    volume: 1000,
  }));
}

function createMockRegistry(): AdapterRegistry {
  const registry = new AdapterRegistry();
  registry.register({
    id: 'hyperliquid',
    name: 'Hyperliquid',
    chains: ['arbitrum'],
    capabilities: {
      perps: true, spot: false, options: false,
      leaderboard: true, mirrorTrading: true, bridging: true,
    },
    getCandles: async () => mockBars(100),
    getOrderbook: async () => ({ bids: [], asks: [], timestamp: 0 }),
    getPrice: async () => ({ symbol: 'BTC', price: 50000, timestamp: Date.now() }),
    getInstruments: async () => [],
    getTicker: async () => ({
      symbol: 'BTC', last: 50000, high24h: 51000, low24h: 49000,
      volume24h: 1e9, change24h: 500, changePct24h: 1, timestamp: Date.now(),
    }),
    getRecentTrades: async () => [],
  } as IExchangeAdapter);
  return registry;
}

describe('TA tools', () => {
  it('should create 10 tools', () => {
    const tools = createTaTools(createMockRegistry());
    expect(tools).toHaveLength(10);
  });

  it('ta_analyze should return full TA report', async () => {
    const tools = createTaTools(createMockRegistry());
    const analyze = tools.find((t) => t.name === 'ta_analyze')!;
    const result = await analyze.execute({ exchange: 'hyperliquid', symbol: 'BTC', timeframe: '1h' });
    const parsed = JSON.parse(result);
    expect(parsed.rsi).toBeDefined();
    expect(parsed.trend).toBeDefined();
    expect(parsed.confidence).toBeDefined();
  });

  it('ta_get_rsi should return RSI values', async () => {
    const tools = createTaTools(createMockRegistry());
    const rsiTool = tools.find((t) => t.name === 'ta_get_rsi')!;
    const result = await rsiTool.execute({ exchange: 'hyperliquid', symbol: 'BTC', timeframe: '1h' });
    const parsed = JSON.parse(result);
    expect(parsed.current).toBeDefined();
    expect(typeof parsed.current).toBe('number');
  });
});
```

**Step 2: Run to verify fail**

Run: `cd skills/lucid-trade && npx vitest run src/tools/technical-analysis.test.ts`

**Step 3: Implement all 10 TA tools**

```typescript
// src/tools/technical-analysis.ts
import { z } from 'zod';
import type { ToolDefinition } from './index.js';
import type { AdapterRegistry } from '../adapters/registry.js';
import type { ExchangeId, Timeframe, OHLCV } from '../types/index.js';
import {
  rsi, macd, bollingerBands, atr, historicalVolatility, sma, ema,
} from '../intelligence/indicators.js';
import {
  detectTrend, findSupportResistance, classifyVolatilityRegime, volatilityMultiplier,
} from '../intelligence/trend.js';

const baseParams = z.object({
  exchange: z.enum(['hyperliquid', 'dydx', 'gmx', 'drift', 'aevo', 'jupiter', 'oneinch']),
  symbol: z.string().describe('Trading pair symbol, e.g. BTC, ETH, SOL'),
  timeframe: z.enum(['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M']).default('1h'),
  limit: z.number().default(100).describe('Number of candles to fetch'),
});

async function fetchCandles(
  registry: AdapterRegistry,
  exchange: ExchangeId,
  symbol: string,
  timeframe: Timeframe,
  limit: number,
): Promise<OHLCV[]> {
  const adapter = registry.get(exchange);
  if (!adapter) throw new Error(`Exchange "${exchange}" not configured`);
  return adapter.getCandles({ symbol, timeframe, limit });
}

export function createTaTools(registry: AdapterRegistry): ToolDefinition[] {
  return [
    {
      name: 'ta_analyze',
      description: 'Full technical analysis report: RSI, MACD, Bollinger Bands, trend, support/resistance, confidence score (0-100), and recommendation (strong_buy to strong_sell)',
      params: baseParams,
      execute: async (p) => {
        const { exchange, symbol, timeframe, limit } = baseParams.parse(p);
        const bars = await fetchCandles(registry, exchange, symbol, timeframe, limit);
        const closes = bars.map((b) => b.close);
        const highs = bars.map((b) => b.high);
        const lows = bars.map((b) => b.low);

        const rsiVals = rsi(closes);
        const macdResult = macd(closes);
        const bbResult = bollingerBands(closes);
        const trendResult = detectTrend(closes);
        const sr = findSupportResistance(bars);
        const atrVals = atr(highs, lows, closes);
        const hv = historicalVolatility(closes);
        const regime = classifyVolatilityRegime(hv);

        const currentRsi = rsiVals[rsiVals.length - 1] ?? 50;
        const currentHistogram = macdResult.histogram[macdResult.histogram.length - 1] ?? 0;
        const price = closes[closes.length - 1]!;
        const lowerBb = bbResult.lower[bbResult.lower.length - 1] ?? price;
        const upperBb = bbResult.upper[bbResult.upper.length - 1] ?? price;

        // Score: each indicator contributes 0-25 points (bull) or 0-(-25) (bear)
        let score = 50; // neutral baseline
        if (currentRsi < 30) score += 15; else if (currentRsi > 70) score -= 15;
        if (currentHistogram > 0) score += 10; else score -= 10;
        if (price < lowerBb) score += 10; else if (price > upperBb) score -= 10;
        if (trendResult.trend.includes('up')) score += 15;
        else if (trendResult.trend.includes('down')) score -= 15;
        score = Math.max(0, Math.min(100, score));

        let recommendation: string;
        if (score >= 80) recommendation = 'strong_buy';
        else if (score >= 60) recommendation = 'buy';
        else if (score >= 40) recommendation = 'neutral';
        else if (score >= 20) recommendation = 'sell';
        else recommendation = 'strong_sell';

        return JSON.stringify({
          symbol, timeframe, exchange,
          price,
          rsi: { current: round(currentRsi), signal: currentRsi < 30 ? 'oversold' : currentRsi > 70 ? 'overbought' : 'neutral' },
          macd: { histogram: round(currentHistogram), signal: currentHistogram > 0 ? 'bullish' : 'bearish' },
          bollingerBands: { upper: round(upperBb), lower: round(lowerBb), signal: price < lowerBb ? 'oversold' : price > upperBb ? 'overbought' : 'neutral' },
          trend: trendResult,
          support: sr.supports.slice(0, 3).map(round),
          resistance: sr.resistances.slice(0, 3).map(round),
          atr: round(atrVals[atrVals.length - 1] ?? 0),
          volatility: { historical: round(hv), regime, positionMultiplier: volatilityMultiplier(regime) },
          confidence: score,
          recommendation,
        }, null, 2);
      },
    },
    {
      name: 'ta_get_rsi',
      description: 'RSI(14) with oversold/overbought signal for any token on any exchange',
      params: baseParams.extend({ period: z.number().default(14) }),
      execute: async (p) => {
        const params = baseParams.extend({ period: z.number().default(14) }).parse(p);
        const bars = await fetchCandles(registry, params.exchange, params.symbol, params.timeframe, params.limit);
        const vals = rsi(bars.map((b) => b.close), params.period);
        const current = vals[vals.length - 1] ?? 50;
        return JSON.stringify({
          symbol: params.symbol, period: params.period,
          current: round(current),
          signal: current < 30 ? 'oversold' : current > 70 ? 'overbought' : 'neutral',
          history: vals.slice(-20).map(round),
        });
      },
    },
    {
      name: 'ta_get_macd',
      description: 'MACD(12,26,9) with histogram and crossover detection',
      params: baseParams,
      execute: async (p) => {
        const params = baseParams.parse(p);
        const bars = await fetchCandles(registry, params.exchange, params.symbol, params.timeframe, params.limit);
        const result = macd(bars.map((b) => b.close));
        const h = result.histogram;
        const crossover = h.length >= 2 && h[h.length - 2]! < 0 && h[h.length - 1]! > 0 ? 'bullish_crossover'
          : h.length >= 2 && h[h.length - 2]! > 0 && h[h.length - 1]! < 0 ? 'bearish_crossover' : 'none';
        return JSON.stringify({
          symbol: params.symbol,
          macdLine: round(result.macdLine[result.macdLine.length - 1] ?? 0),
          signalLine: round(result.signalLine[result.signalLine.length - 1] ?? 0),
          histogram: round(h[h.length - 1] ?? 0),
          crossover,
          signal: (h[h.length - 1] ?? 0) > 0 ? 'bullish' : 'bearish',
        });
      },
    },
    {
      name: 'ta_get_bollinger',
      description: 'Bollinger Bands(20,2) with squeeze detection',
      params: baseParams,
      execute: async (p) => {
        const params = baseParams.parse(p);
        const bars = await fetchCandles(registry, params.exchange, params.symbol, params.timeframe, params.limit);
        const result = bollingerBands(bars.map((b) => b.close));
        const i = result.middle.length - 1;
        const upper = result.upper[i] ?? 0;
        const lower = result.lower[i] ?? 0;
        const middle = result.middle[i] ?? 0;
        const width = middle > 0 ? ((upper - lower) / middle) * 100 : 0;
        const price = bars[bars.length - 1]?.close ?? 0;
        return JSON.stringify({
          symbol: params.symbol,
          upper: round(upper), middle: round(middle), lower: round(lower),
          width: round(width),
          squeeze: width < 5,
          signal: price < lower ? 'oversold' : price > upper ? 'overbought' : 'neutral',
        });
      },
    },
    {
      name: 'ta_get_trend',
      description: 'Trend classification via SMA 20/50 crossover: strong_uptrend, uptrend, sideways, downtrend, strong_downtrend',
      params: baseParams,
      execute: async (p) => {
        const params = baseParams.parse(p);
        const bars = await fetchCandles(registry, params.exchange, params.symbol, params.timeframe, Math.max(params.limit, 60));
        const result = detectTrend(bars.map((b) => b.close));
        return JSON.stringify({ symbol: params.symbol, ...result });
      },
    },
    {
      name: 'ta_get_support_resistance',
      description: 'Auto-detected support and resistance levels from swing highs/lows',
      params: baseParams,
      execute: async (p) => {
        const params = baseParams.parse(p);
        const bars = await fetchCandles(registry, params.exchange, params.symbol, params.timeframe, params.limit);
        const result = findSupportResistance(bars);
        return JSON.stringify({
          symbol: params.symbol,
          supports: result.supports.slice(0, 5).map(round),
          resistances: result.resistances.slice(0, 5).map(round),
        });
      },
    },
    {
      name: 'ta_get_volatility_regime',
      description: 'Volatility regime classification (low/moderate/high/extreme) with position sizing multiplier',
      params: baseParams,
      execute: async (p) => {
        const params = baseParams.parse(p);
        const bars = await fetchCandles(registry, params.exchange, params.symbol, params.timeframe, params.limit);
        const hv = historicalVolatility(bars.map((b) => b.close));
        const regime = classifyVolatilityRegime(hv);
        return JSON.stringify({
          symbol: params.symbol,
          historicalVolatility: round(hv),
          regime,
          positionMultiplier: volatilityMultiplier(regime),
        });
      },
    },
    {
      name: 'ta_get_atr',
      description: 'ATR and ATR% for stop-loss distance and position sizing',
      params: baseParams.extend({ period: z.number().default(14) }),
      execute: async (p) => {
        const params = baseParams.extend({ period: z.number().default(14) }).parse(p);
        const bars = await fetchCandles(registry, params.exchange, params.symbol, params.timeframe, params.limit);
        const vals = atr(bars.map((b) => b.high), bars.map((b) => b.low), bars.map((b) => b.close), params.period);
        const current = vals[vals.length - 1] ?? 0;
        const price = bars[bars.length - 1]?.close ?? 1;
        return JSON.stringify({
          symbol: params.symbol, period: params.period,
          atr: round(current),
          atrPct: round((current / price) * 100),
          suggestedStopDistance: round(current * 1.5),
        });
      },
    },
    {
      name: 'ta_get_ema_crossover',
      description: 'EMA crossover signals with configurable fast/slow periods',
      params: baseParams.extend({
        fastPeriod: z.number().default(9),
        slowPeriod: z.number().default(21),
      }),
      execute: async (p) => {
        const params = baseParams.extend({
          fastPeriod: z.number().default(9),
          slowPeriod: z.number().default(21),
        }).parse(p);
        const bars = await fetchCandles(registry, params.exchange, params.symbol, params.timeframe, params.limit);
        const closes = bars.map((b) => b.close);
        const fast = ema(closes, params.fastPeriod);
        const slow = ema(closes, params.slowPeriod);
        const offset = params.slowPeriod - params.fastPeriod;
        const prevFast = fast[fast.length - 2 + offset] ?? 0;
        const prevSlow = slow[slow.length - 2] ?? 0;
        const currFast = fast[fast.length - 1 + offset] ?? 0;
        const currSlow = slow[slow.length - 1] ?? 0;
        let crossover = 'none';
        if (prevFast <= prevSlow && currFast > currSlow) crossover = 'bullish';
        if (prevFast >= prevSlow && currFast < currSlow) crossover = 'bearish';
        return JSON.stringify({
          symbol: params.symbol, fastPeriod: params.fastPeriod, slowPeriod: params.slowPeriod,
          fastEma: round(currFast), slowEma: round(currSlow),
          crossover,
          trend: currFast > currSlow ? 'bullish' : 'bearish',
        });
      },
    },
    {
      name: 'ta_score_setup',
      description: 'Composite setup score (0-100) combining RSI, MACD, Bollinger, trend, and volatility. Higher = stronger bullish signal.',
      params: baseParams,
      execute: async (p) => {
        const params = baseParams.parse(p);
        // Delegate to ta_analyze and extract score
        const analyzeTool = createTaTools(registry).find((t) => t.name === 'ta_analyze')!;
        const result = await analyzeTool.execute(p);
        const parsed = JSON.parse(result);
        return JSON.stringify({
          symbol: params.symbol,
          score: parsed.confidence,
          recommendation: parsed.recommendation,
          components: {
            rsi: parsed.rsi.signal,
            macd: parsed.macd.signal,
            bollinger: parsed.bollingerBands.signal,
            trend: parsed.trend.trend,
            volatility: parsed.volatility.regime,
          },
        });
      },
    },
  ];
}

function round(n: number, decimals = 4): number {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}
```

**Step 4: Update tools/index.ts to include TA tools**

```typescript
// src/tools/index.ts
import { z } from 'zod';
import type { AdapterRegistry } from '../adapters/registry.js';
import { createTaTools } from './technical-analysis.js';

export interface ToolDefinition {
  name: string;
  description: string;
  params: z.ZodObject<any>;
  execute: (params: Record<string, unknown>) => Promise<string>;
}

export function createAllTools(deps: { registry: AdapterRegistry }): ToolDefinition[] {
  return [
    ...createTaTools(deps.registry),
    // More tool categories will be added here
  ];
}
```

**Step 5: Run tests**

Run: `cd skills/lucid-trade && npx vitest run src/tools/technical-analysis.test.ts`
Expected: All pass

**Step 6: Build to verify compilation**

Run: `cd skills/lucid-trade && npx tsup`
Expected: Clean build

**Step 7: Commit**

```bash
git add skills/lucid-trade/src/tools/
git commit -m "feat(trade): add 10 TA MCP tools — analyze, RSI, MACD, Bollinger, trend, S/R, ATR, volatility, EMA crossover, setup score"
```

---

## Phase 4-10: Remaining Phases (Summary)

> **Note:** Phases 4-10 follow the identical TDD pattern above. Each phase creates an adapter or tool category, writes failing tests first, implements, verifies, commits.

### Phase 4: Risk Management Tools (8 tools)
- `src/tools/risk.ts` — Wraps risk-engine.ts as MCP tools
- Tools: `risk_calculate_position_size`, `risk_get_portfolio_var`, `risk_get_max_drawdown`, `risk_check_exposure`, `risk_check_concentration`, `risk_get_liquidation_price`, `risk_set_daily_loss_cap`, `risk_get_health_report`

### Phase 5: Simulation & Backtesting Tools (8 tools)
- `src/tools/simulation.ts` — Wraps backtester.ts as MCP tools
- Tools: `sim_preview_trade`, `sim_preview_mirror`, `sim_backtest_sma`, `sim_backtest_rsi`, `sim_backtest_custom`, `sim_monte_carlo`, `sim_what_if`, `sim_compare_exchanges`

### Phase 6: Hyperliquid Adapter
- `src/adapters/hyperliquid/client.ts` — REST API client
- `src/adapters/hyperliquid/adapter.ts` — IExchangeAdapter implementation
- `src/adapters/hyperliquid/leaderboard.ts` — Trader discovery
- Covers: market data, execution, trader discovery, mirror trading, bridging
- **Milestone: Direct Senpi competition unlocked**

### Phase 7: Jupiter + 1inch Adapters (Spot)
- `src/adapters/jupiter/` — Solana DEX aggregator
- `src/adapters/oneinch/` — EVM DEX aggregator (6 chains)
- Spot swap tools: `trade_swap_spot`, `trade_get_optimal_route`

### Phase 8: Market Data + Trader Discovery Tools (27 tools)
- `src/tools/market-data.ts` — 15 tools wrapping adapter market data methods
- `src/tools/trader-discovery.ts` — 12 tools wrapping leaderboard + cross-exchange scoring
- Includes unique cross-exchange tools: `market_get_funding_comparison`, `market_get_price_comparison`, `trader_rank_cross_exchange`

### Phase 9: Execution + Strategy + Portfolio Tools (44 tools)
- `src/tools/execution.ts` — 14 trade execution tools
- `src/tools/strategy.ts` — 18 strategy management tools
- `src/tools/portfolio.ts` — 12 portfolio intelligence tools

### Phase 10: dYdX + GMX + Drift + Aevo Adapters
- One adapter per exchange, same IExchangeAdapter pattern
- Each unlocks that exchange across ALL existing tools automatically

### Phase 11: Momentum Intelligence Tools (10 tools)
- `src/tools/momentum.ts` — Cross-exchange momentum detection
- Unique tools: `momentum_get_funding_divergence`, `momentum_get_cross_exchange_flow`, `momentum_get_correlation_break`

### Phase 12: Autonomous Trading Engine (10 tools)
- `src/autonomous/bot.ts` — Bot lifecycle
- `src/autonomous/scanner.ts` — Opportunity scanning
- `src/autonomous/dsl.ts` — Dynamic trailing stop (our version)
- `src/autonomous/howl.ts` — Self-improvement analysis

### Phase 13: Audit + Guides (8 tools)
- `src/tools/audit.ts` — 5 decision logging tools
- `src/tools/guides.ts` — 3 reference tools
- Update skill.yaml, openclaw.plugin.json, README.md

---

## Execution Order

| Phase | Tools Added | Running Total | Key Deliverable |
|-------|------------|---------------|-----------------|
| 1 | 0 | 0 | Scaffold, types, adapter interface, MCP shell |
| 2 | 0 | 0 | Intelligence layer (TA, risk, backtesting) |
| 3 | 10 | 10 | TA tools — first working MCP tools |
| 4 | 8 | 18 | Risk tools — Kelly, sizing, VaR |
| 5 | 8 | 26 | Backtesting tools — simulations |
| 6 | 0 | 26 | Hyperliquid adapter — Senpi parity |
| 7 | 0 | 26 | Jupiter + 1inch adapters — spot |
| 8 | 27 | 53 | Market data + trader discovery tools |
| 9 | 44 | 97 | Execution + strategy + portfolio |
| 10 | 0 | 97 | dYdX + GMX + Drift + Aevo adapters |
| 11 | 10 | 107 | Momentum intelligence |
| 12 | 10 | 117 | Autonomous trading |
| 13 | 8 | 125 | Audit + guides + polish |

**Phase 6 = Senpi parity. Phase 13 = 300% ahead.**
