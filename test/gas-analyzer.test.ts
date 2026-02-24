// ---------------------------------------------------------------------------
// gas-analyzer.test.ts -- Tests for gas optimization analysis
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  detectStorageInLoops,
  detectUnnecessarySloads,
  detectPackingIssues,
  detectLoopOptimizations,
  detectVisibilityOptimizations,
  detectMiscGasIssues,
  fullGasAnalysis,
} from '../src/core/analysis/gas-analyzer.js';

const STORAGE_IN_LOOP = `
pragma solidity ^0.8.0;
contract Token {
  mapping(address => uint256) public _balances;
  address[] public users;
  function distribute() public {
    for (uint256 i = 0; i < users.length; i++) {
      uint256 bal = _balances[users[i]];
      amounts[i] += 100;
    }
  }
}
`;

const REPEATED_SLOAD = `
pragma solidity ^0.8.0;
contract Token {
  uint256 public _totalSupply;
  function check() public view returns (bool) {
    if (_totalSupply > 0) {
      if (_totalSupply < 1000) {
        return _totalSupply > 500;
      }
    }
    return false;
  }
}
`;

const STRING_STORAGE = `
pragma solidity ^0.8.0;
contract Registry {
  string name;
  string symbol;
}
`;

const SMALL_UINT_STORAGE = `
pragma solidity ^0.8.0;
contract Config {
  uint8 decimals;
  uint16 maxFee;
}
`;

const SMALL_UINT_IN_STRUCT = `
pragma solidity ^0.8.0;
contract Config {
  struct Data {
    uint8 decimals;
    uint16 maxFee;
  }
  Data public data;
}
`;

const ARRAY_LENGTH_IN_LOOP = `
pragma solidity ^0.8.0;
contract Token {
  address[] public holders;
  function process() public {
    for (uint i = 0; i < holders.length; i++) {
      // process holder
    }
  }
}
`;

const POST_INCREMENT_LOOP = `
pragma solidity ^0.8.0;
contract Token {
  function count(uint256 n) public pure returns (uint256) {
    uint256 sum = 0;
    for (uint256 i = 0; i < n; i++) {
      sum += i;
    }
    return sum;
  }
}
`;

const PUBLIC_NOT_INTERNAL = `
pragma solidity ^0.8.0;
contract Token {
  function doWork(uint256 amount) public returns (uint256) {
    return amount * 2;
  }
}
`;

const LONG_REVERT_STRING = `
pragma solidity ^0.8.0;
contract Token {
  function transfer(address to, uint256 amount) public {
    require(amount > 0, "Transfer amount must be greater than zero and not negative");
  }
}
`;

const GT_ZERO_CHECK = `
pragma solidity ^0.8.0;
contract Token {
  function transfer(address to, uint256 amount) public {
    require(amount > 0, "Zero");
  }
}
`;

const BOOL_STORAGE = `
pragma solidity ^0.8.0;
contract Token {
  bool paused;
  bool initialized;
}
`;

const CLEAN_CONTRACT = `
pragma solidity ^0.8.0;
contract Clean {
  function getValue() external pure returns (uint256) {
    return 42;
  }
}
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('detectStorageInLoops', () => {
  it('detects storage reads inside loops', () => {
    const issues = detectStorageInLoops(STORAGE_IN_LOOP);
    expect(issues.some((i) => i.title.includes('Storage Read Inside Loop'))).toBe(true);
  });

  it('detects storage writes inside loops', () => {
    const issues = detectStorageInLoops(STORAGE_IN_LOOP);
    expect(issues.some((i) => i.title.includes('Storage Write Inside Loop'))).toBe(true);
  });

  it('returns empty for clean contract', () => {
    const issues = detectStorageInLoops(CLEAN_CONTRACT);
    expect(issues.length).toBe(0);
  });
});

describe('detectUnnecessarySloads', () => {
  it('detects repeated state variable reads', () => {
    const issues = detectUnnecessarySloads(REPEATED_SLOAD);
    expect(issues.some((i) => i.title.includes('Repeated Storage Read'))).toBe(true);
  });

  it('returns empty for clean contract', () => {
    const issues = detectUnnecessarySloads(CLEAN_CONTRACT);
    expect(issues.length).toBe(0);
  });
});

describe('detectPackingIssues', () => {
  it('flags string storage variables', () => {
    const issues = detectPackingIssues(STRING_STORAGE);
    expect(issues.some((i) => i.title.includes('bytes32'))).toBe(true);
    expect(issues.length).toBe(2);
  });

  it('flags small uint outside struct', () => {
    const issues = detectPackingIssues(SMALL_UINT_STORAGE);
    expect(issues.some((i) => i.title.includes('Small uint'))).toBe(true);
  });

  it('does not flag small uint inside struct', () => {
    const issues = detectPackingIssues(SMALL_UINT_IN_STRUCT);
    const smallUintIssues = issues.filter((i) => i.title.includes('Small uint'));
    expect(smallUintIssues.length).toBe(0);
  });
});

describe('detectLoopOptimizations', () => {
  it('detects array length in loop condition', () => {
    const issues = detectLoopOptimizations(ARRAY_LENGTH_IN_LOOP);
    expect(issues.some((i) => i.title.includes('Array Length'))).toBe(true);
  });

  it('detects post-increment in loop', () => {
    const issues = detectLoopOptimizations(POST_INCREMENT_LOOP);
    expect(issues.some((i) => i.title.includes('Post-increment'))).toBe(true);
  });

  it('detects unbounded loop', () => {
    const issues = detectLoopOptimizations(ARRAY_LENGTH_IN_LOOP);
    expect(issues.some((i) => i.title.includes('Unbounded'))).toBe(true);
  });
});

describe('detectVisibilityOptimizations', () => {
  it('suggests external for public functions not called internally', () => {
    const issues = detectVisibilityOptimizations(PUBLIC_NOT_INTERNAL);
    expect(issues.some((i) => i.title.includes('External'))).toBe(true);
  });
});

describe('detectMiscGasIssues', () => {
  it('detects long revert strings', () => {
    const issues = detectMiscGasIssues(LONG_REVERT_STRING);
    expect(issues.some((i) => i.title.includes('Long Revert String'))).toBe(true);
  });

  it('suggests != 0 over > 0', () => {
    const issues = detectMiscGasIssues(GT_ZERO_CHECK);
    expect(issues.some((i) => i.title.includes('!= 0'))).toBe(true);
  });

  it('flags boolean storage variables', () => {
    const issues = detectMiscGasIssues(BOOL_STORAGE);
    expect(issues.some((i) => i.title.includes('Boolean'))).toBe(true);
  });
});

describe('fullGasAnalysis', () => {
  it('returns comprehensive analysis with summary', () => {
    const result = fullGasAnalysis(STORAGE_IN_LOOP);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.totalEstimatedSavings).toBeGreaterThan(0);
    expect(result.summary).toContain('Found');
  });

  it('returns clean summary for optimized contract', () => {
    const result = fullGasAnalysis(CLEAN_CONTRACT);
    expect(result.issues.length).toBe(0);
    expect(result.summary).toContain('No gas');
  });

  it('deduplicates issues', () => {
    const result = fullGasAnalysis(STORAGE_IN_LOOP);
    const keys = result.issues.map((i) => `${i.title}:${i.location}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});
