import { describe, it, expect } from 'vitest';
import {
  classifyTransaction,
  isSwap,
  isStaking,
  isBridge,
  isAirdrop,
  isMint,
  isBurn,
  type ClassifiableTransaction,
} from '../src/core/analysis/transaction-classifier.js';

function makeTx(overrides: Partial<ClassifiableTransaction> = {}): ClassifiableTransaction {
  return {
    from_address: '0xaaaa',
    to_address: '0xbbbb',
    token_symbol: 'ETH',
    amount: 1,
    fee_usd: 5,
    tx_hash: '0xhash',
    wallet_address: '0xaaaa',
    ...overrides,
  };
}

describe('Transaction Classifier', () => {
  describe('isSwap', () => {
    it('should detect Uniswap V2 router', () => {
      const tx = makeTx({ to_address: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d' });
      expect(isSwap(tx)).toBe(true);
    });

    it('should detect swap by function name', () => {
      const tx = makeTx({ function_name: 'swapExactTokensForTokens' });
      expect(isSwap(tx)).toBe(true);
    });

    it('should detect exactInput functions', () => {
      const tx = makeTx({ function_name: 'exactInputSingle' });
      expect(isSwap(tx)).toBe(true);
    });

    it('should not detect regular transfers as swaps', () => {
      const tx = makeTx({});
      expect(isSwap(tx)).toBe(false);
    });
  });

  describe('isStaking', () => {
    it('should detect stake by method ID', () => {
      const tx = makeTx({ method_id: '0xa694fc3a' });
      expect(isStaking(tx)).toBe(true);
    });

    it('should detect stake by function name', () => {
      const tx = makeTx({ function_name: 'stakeTokens' });
      expect(isStaking(tx)).toBe(true);
    });

    it('should not classify normal transfer as staking', () => {
      const tx = makeTx({ function_name: 'transfer' });
      expect(isStaking(tx)).toBe(false);
    });
  });

  describe('isBridge', () => {
    it('should detect Wormhole bridge', () => {
      const tx = makeTx({ to_address: '0x3ee18b2214aff97000d974cf647e7c347e8fa585' });
      expect(isBridge(tx)).toBe(true);
    });

    it('should detect bridge by function name', () => {
      const tx = makeTx({ function_name: 'bridgeToL2' });
      expect(isBridge(tx)).toBe(true);
    });

    it('should detect crosschain by function name', () => {
      const tx = makeTx({ function_name: 'crosschainTransfer' });
      expect(isBridge(tx)).toBe(true);
    });
  });

  describe('isAirdrop', () => {
    it('should detect airdrop when receiving with zero fees', () => {
      const tx = makeTx({
        from_address: '0xdistributor',
        to_address: '0xaaaa',
        wallet_address: '0xaaaa',
        fee_usd: 0,
      });
      expect(isAirdrop(tx)).toBe(true);
    });

    it('should detect airdrop by function name', () => {
      const tx = makeTx({ function_name: 'claimAirdrop' });
      expect(isAirdrop(tx)).toBe(true);
    });

    it('should not flag self-transfers as airdrops', () => {
      const tx = makeTx({
        from_address: '0xaaaa',
        to_address: '0xaaaa',
        wallet_address: '0xaaaa',
        fee_usd: 0,
      });
      expect(isAirdrop(tx)).toBe(false);
    });
  });

  describe('isMint / isBurn', () => {
    it('should detect mint from null address', () => {
      const tx = makeTx({ from_address: '0x0000000000000000000000000000000000000000' });
      expect(isMint(tx)).toBe(true);
    });

    it('should detect burn to dead address', () => {
      const tx = makeTx({ to_address: '0x000000000000000000000000000000000000dead' });
      expect(isBurn(tx)).toBe(true);
    });
  });

  describe('classifyTransaction', () => {
    it('should classify a swap', () => {
      const tx = makeTx({
        to_address: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
        wallet_address: '0xaaaa',
      });
      expect(classifyTransaction(tx)).toBe('swap');
    });

    it('should classify a mint', () => {
      const tx = makeTx({
        from_address: '0x0000000000000000000000000000000000000000',
        wallet_address: '0xaaaa',
      });
      expect(classifyTransaction(tx)).toBe('mint');
    });

    it('should classify a burn', () => {
      const tx = makeTx({
        to_address: '0x000000000000000000000000000000000000dead',
        from_address: '0xaaaa',
        wallet_address: '0xaaaa',
      });
      expect(classifyTransaction(tx)).toBe('burn');
    });

    it('should classify a transfer out', () => {
      const tx = makeTx({
        from_address: '0xaaaa',
        to_address: '0xcccc',
        wallet_address: '0xaaaa',
      });
      expect(classifyTransaction(tx)).toBe('transfer_out');
    });

    it('should classify a transfer in', () => {
      const tx = makeTx({
        from_address: '0xcccc',
        to_address: '0xaaaa',
        wallet_address: '0xaaaa',
        fee_usd: 5, // non-zero so not airdrop
      });
      expect(classifyTransaction(tx)).toBe('transfer_in');
    });

    it('should classify stake with specific method', () => {
      const tx = makeTx({
        method_id: '0xa694fc3a',
        from_address: '0xaaaa',
        to_address: '0xstaking',
        wallet_address: '0xaaaa',
      });
      expect(classifyTransaction(tx)).toBe('stake');
    });

    it('should classify unstake', () => {
      const tx = makeTx({
        method_id: '0x2e1a7d4d',
        from_address: '0xstaking',
        to_address: '0xaaaa',
        wallet_address: '0xaaaa',
      });
      expect(classifyTransaction(tx)).toBe('unstake');
    });

    it('should classify claim rewards', () => {
      const tx = makeTx({
        method_id: '0x3d18b912',
        from_address: '0xstaking',
        to_address: '0xaaaa',
        wallet_address: '0xaaaa',
      });
      expect(classifyTransaction(tx)).toBe('claim');
    });
  });
});
