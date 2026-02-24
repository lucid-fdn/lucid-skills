import type { TxType } from '../types/common.js';

/** Known DEX router addresses (lowercase) */
const DEX_ROUTERS = new Set([
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap V2
  '0xe592427a0aece92de3edee1f18e0157c05861564', // Uniswap V3
  '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f', // SushiSwap
  '0x1111111254fb6c44bac0bed2854e76f90643097d', // 1inch V4
  '0x1111111254eeb25477b68fb85ed929f73a960582', // 1inch V5
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff', // 0x
  '0x3a6d8ca21d1cf76f653a67577fa0d27453350dd8', // Pancakeswap V3
]);

/** Known staking contract method signatures */
const STAKE_METHODS = new Set([
  '0xa694fc3a', // stake(uint256)
  '0x2e1a7d4d', // withdraw(uint256) — unstake
  '0x3d18b912', // getReward()
  '0xe9fad8ee', // exit()
]);

/** Known bridge contract addresses (lowercase) */
const BRIDGE_CONTRACTS = new Set([
  '0x3ee18b2214aff97000d974cf647e7c347e8fa585', // Wormhole
  '0x99c9fc46f92e8a1c0dec1b1747d010903e884be1', // Optimism Gateway
  '0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f', // Arbitrum Inbox
  '0x3154cf16ccdb4c6d922629664174b904d80f2c35', // Base Bridge
]);

/** Null/zero address patterns */
const NULL_ADDRESSES = new Set([
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dead',
  '11111111111111111111111111111111', // Solana system program
]);

export interface ClassifiableTransaction {
  from_address: string;
  to_address: string;
  token_symbol: string;
  amount: number;
  fee_usd: number;
  tx_hash: string;
  /** The wallet address we are tracking */
  wallet_address: string;
  method_id?: string;
  function_name?: string;
}

/**
 * Check if a transaction is a swap (DEX trade).
 */
export function isSwap(tx: ClassifiableTransaction): boolean {
  const to = tx.to_address.toLowerCase();
  if (DEX_ROUTERS.has(to)) return true;

  const fn = (tx.function_name ?? '').toLowerCase();
  if (fn.includes('swap') || fn.includes('exactinput') || fn.includes('exactoutput')) return true;

  return false;
}

/**
 * Check if a transaction is a staking operation.
 */
export function isStaking(tx: ClassifiableTransaction): boolean {
  const methodId = tx.method_id ?? '';
  if (STAKE_METHODS.has(methodId)) return true;

  const fn = (tx.function_name ?? '').toLowerCase();
  if (fn.includes('stake') || fn.includes('deposit') && fn.includes('pool')) return true;

  return false;
}

/**
 * Check if a transaction is a bridge operation.
 */
export function isBridge(tx: ClassifiableTransaction): boolean {
  const to = tx.to_address.toLowerCase();
  if (BRIDGE_CONTRACTS.has(to)) return true;

  const fn = (tx.function_name ?? '').toLowerCase();
  if (fn.includes('bridge') || fn.includes('crosschain') || fn.includes('relay')) return true;

  return false;
}

/**
 * Check if a transaction is an airdrop.
 */
export function isAirdrop(tx: ClassifiableTransaction): boolean {
  const wallet = tx.wallet_address.toLowerCase();
  const from = tx.from_address.toLowerCase();
  const to = tx.to_address.toLowerCase();

  // Airdrop: tokens received, no outgoing value, from an unfamiliar address
  if (to === wallet && from !== wallet && tx.fee_usd === 0) {
    return true;
  }

  const fn = (tx.function_name ?? '').toLowerCase();
  if (fn.includes('airdrop') || fn.includes('claim') || fn.includes('distribute')) return true;

  return false;
}

/**
 * Check if a transaction is a mint (from null address).
 */
export function isMint(tx: ClassifiableTransaction): boolean {
  return NULL_ADDRESSES.has(tx.from_address.toLowerCase());
}

/**
 * Check if a transaction is a burn (to null address).
 */
export function isBurn(tx: ClassifiableTransaction): boolean {
  return NULL_ADDRESSES.has(tx.to_address.toLowerCase());
}

/**
 * Auto-classify a transaction type from on-chain data.
 */
export function classifyTransaction(tx: ClassifiableTransaction): TxType {
  const wallet = tx.wallet_address.toLowerCase();
  const from = tx.from_address.toLowerCase();
  const to = tx.to_address.toLowerCase();

  // Mints
  if (isMint(tx)) return 'mint';

  // Burns
  if (isBurn(tx)) return 'burn';

  // Bridges
  if (isBridge(tx)) return 'bridge';

  // Swaps
  if (isSwap(tx)) return 'swap';

  // Staking
  if (isStaking(tx)) {
    const methodId = tx.method_id ?? '';
    const fn = (tx.function_name ?? '').toLowerCase();
    if (methodId === '0x2e1a7d4d' || fn.includes('withdraw') || fn.includes('unstake')) {
      return 'unstake';
    }
    if (methodId === '0x3d18b912' || fn.includes('reward') || fn.includes('claim')) {
      return 'claim';
    }
    return 'stake';
  }

  // Airdrops
  if (isAirdrop(tx)) return 'airdrop';

  // Transfers
  if (from === wallet && to !== wallet) return 'transfer_out';
  if (to === wallet && from !== wallet) return 'transfer_in';

  // Default: if we're sending, it's a sell; if receiving, it's a buy
  if (from === wallet) return 'sell';
  return 'buy';
}
