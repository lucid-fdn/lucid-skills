// ---------------------------------------------------------------------------
// brain/analysis.test.ts -- Comprehensive tests for brain layer
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { runAudit, runCompare, runBatchScan, runGasAnalysis } from '../../src/brain/analysis.js';
import { formatAuditResult, formatCompareResult, formatBatchResult, formatGasResult } from '../../src/brain/formatter.js';
import { createBrainTools } from '../../src/brain/tools.js';
import type { AuditVerdict } from '../../src/brain/types.js';

// ---------------------------------------------------------------------------
// Sample Solidity contracts
// ---------------------------------------------------------------------------

const SAFE_CONTRACT = `
pragma solidity ^0.8.20;
contract Safe {
  uint256 public value;
  function getValue() public view returns (uint256) {
    return value;
  }
  function setValue(uint256 _value) internal {
    value = _value;
  }
}
`;

const REENTRANCY_CONTRACT = `
pragma solidity ^0.8.0;
contract Vulnerable {
  mapping(address => uint256) public balances;
  function withdraw() public {
    uint256 amount = balances[msg.sender];
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);
    balances[msg.sender] = 0;
  }
  function deposit() public payable {
    balances[msg.sender] += msg.value;
  }
}
`;

const OLD_SOLIDITY_CONTRACT = `
pragma solidity ^0.6.0;
contract OldToken {
  mapping(address => uint256) balances;
  function add(uint256 a, uint256 b) public pure returns (uint256) {
    return a + b;
  }
  function subtract(uint256 a, uint256 b) public pure returns (uint256) {
    return a - b;
  }
}
`;

const GAS_HEAVY_CONTRACT = `
pragma solidity ^0.8.0;
contract GasHeavy {
  mapping(address => uint256) public balances;
  string public name;
  string public symbol;
  bool public paused;

  function batchTransfer(address[] memory recipients, uint256[] memory amounts) public {
    for (uint256 i = 0; i < recipients.length; i++) {
      balances[recipients[i]] += amounts[i];
    }
  }

  function getInfo() public view returns (uint256) {
    uint256 a = balances[msg.sender];
    uint256 b = balances[msg.sender];
    uint256 c = balances[msg.sender];
    return a + b + c;
  }

  function doStuff(uint256 amount) public {
    require(amount > 0, "Amount must be greater than zero to proceed with the operation");
  }
}
`;

const MULTI_VULN_CONTRACT = `
pragma solidity ^0.8.0;
contract MultiVuln {
  address public owner;
  mapping(address => uint256) public balances;

  function withdraw() public {
    uint256 amount = balances[msg.sender];
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);
    balances[msg.sender] = 0;
  }

  function setFee(uint256 fee) public {
    // no access control
  }

  function updateOwner(address newOwner) public {
    // no access control
  }

  function swap(uint256 amountIn) public {
    uint256 amountOut = amountIn * 2;
  }

  function getPrice() public view returns (uint256) {
    (uint112 reserve0, uint112 reserve1, ) = pair.getReserves();
    uint256 price = uint256(reserve0) / uint256(reserve1);
    return price;
  }
}
`;

const FIXED_CONTRACT = `
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
contract Fixed is ReentrancyGuard, Ownable {
  mapping(address => uint256) public balances;
  function withdraw() public nonReentrant {
    uint256 amount = balances[msg.sender];
    balances[msg.sender] = 0;
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);
  }
  function setFee(uint256 fee) public onlyOwner {
    // protected
  }
}
`;

const EMPTY_SOURCE = '';

const MINIMAL_CONTRACT = `
pragma solidity ^0.8.0;
contract Minimal {}
`;

// ---------------------------------------------------------------------------
// runAudit tests
// ---------------------------------------------------------------------------

describe('runAudit', () => {
  it('returns SAFE verdict for clean contract', () => {
    const result = runAudit({ sourceCode: SAFE_CONTRACT, contractName: 'Safe' });
    expect(result.verdict).toBe('SAFE');
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.grade).toMatch(/^[AB]$/);
    expect(result.schemaVersion).toBe(1);
    expect(result.contract.name).toBe('Safe');
    expect(result.provenance.tool).toBe('lucid-audit');
  });

  it('returns CRITICAL verdict for reentrancy vulnerability', () => {
    const result = runAudit({ sourceCode: REENTRANCY_CONTRACT, contractName: 'Vulnerable' });
    expect(result.verdict).toBe('CRITICAL');
    expect(result.findings.critical).toBeGreaterThan(0);
    expect(result.topVulnerabilities.length).toBeGreaterThan(0);
    expect(result.topVulnerabilities.some((v) => v.category === 'reentrancy')).toBe(true);
  });

  it('detects old Solidity version as risk factor', () => {
    const result = runAudit({ sourceCode: OLD_SOLIDITY_CONTRACT, contractName: 'OldToken' });
    expect(result.riskFactors.some((r) => r.includes('0.8.0'))).toBe(true);
    expect(result.contract.solidityVersion).toBeTruthy();
  });

  it('includes gas analysis in result', () => {
    const result = runAudit({ sourceCode: GAS_HEAVY_CONTRACT, contractName: 'GasHeavy' });
    expect(result.gasAnalysis.totalIssues).toBeGreaterThan(0);
    expect(result.gasAnalysis.topOpportunities.length).toBeGreaterThan(0);
  });

  it('handles empty source code gracefully', () => {
    const result = runAudit({ sourceCode: EMPTY_SOURCE });
    expect(result.verdict).toBe('SAFE');
    expect(result.score).toBe(100);
    expect(result.findings.critical).toBe(0);
    expect(result.contract.name).toBe('Unknown');
  });

  it('handles minimal contract with no vulnerabilities', () => {
    const result = runAudit({ sourceCode: MINIMAL_CONTRACT, contractName: 'Minimal' });
    expect(result.verdict).toBe('SAFE');
    expect(result.score).toBe(100);
    expect(result.topVulnerabilities.length).toBe(0);
  });

  it('caps topVulnerabilities at 10', () => {
    const result = runAudit({ sourceCode: MULTI_VULN_CONTRACT, contractName: 'MultiVuln' });
    expect(result.topVulnerabilities.length).toBeLessThanOrEqual(10);
  });

  it('caps topOpportunities at 5', () => {
    const result = runAudit({ sourceCode: GAS_HEAVY_CONTRACT });
    expect(result.gasAnalysis.topOpportunities.length).toBeLessThanOrEqual(5);
  });

  it('sets chain and address when provided', () => {
    const result = runAudit({
      sourceCode: SAFE_CONTRACT,
      contractName: 'Safe',
      chain: 'ethereum',
      address: '0x1234567890abcdef1234567890abcdef12345678',
    });
    expect(result.contract.chain).toBe('ethereum');
    expect(result.contract.address).toBe('0x1234567890abcdef1234567890abcdef12345678');
  });

  it('includes correct findings counts', () => {
    const result = runAudit({ sourceCode: MULTI_VULN_CONTRACT });
    const totalFindings =
      result.findings.critical +
      result.findings.high +
      result.findings.medium +
      result.findings.low +
      result.findings.info;
    expect(totalFindings).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Verdict logic tests
// ---------------------------------------------------------------------------

describe('verdict logic', () => {
  it('CRITICAL when any critical finding exists regardless of score', () => {
    const result = runAudit({ sourceCode: REENTRANCY_CONTRACT });
    expect(result.verdict).toBe('CRITICAL');
  });

  it('SAFE for score >= 75 with no criticals', () => {
    const result = runAudit({ sourceCode: SAFE_CONTRACT });
    expect(result.verdict).toBe('SAFE');
    expect(result.score).toBeGreaterThanOrEqual(75);
  });
});

// ---------------------------------------------------------------------------
// runCompare tests
// ---------------------------------------------------------------------------

describe('runCompare', () => {
  it('shows IMPROVED when second version fixes issues', () => {
    const result = runCompare({
      sourceA: REENTRANCY_CONTRACT,
      sourceB: FIXED_CONTRACT,
      labelA: 'v1',
      labelB: 'v2',
    });
    expect(result.verdict).toBe('IMPROVED');
    expect(result.scoreDelta).toBeGreaterThan(0);
    expect(result.contractA.name).toBe('v1');
    expect(result.contractB.name).toBe('v2');
    expect(result.fixedIssues.length).toBeGreaterThan(0);
  });

  it('shows REGRESSED when second version introduces issues', () => {
    const result = runCompare({
      sourceA: SAFE_CONTRACT,
      sourceB: REENTRANCY_CONTRACT,
    });
    expect(result.verdict).toBe('REGRESSED');
    expect(result.scoreDelta).toBeLessThan(0);
    expect(result.newIssues.length).toBeGreaterThan(0);
  });

  it('shows UNCHANGED when both versions are identical', () => {
    const result = runCompare({
      sourceA: SAFE_CONTRACT,
      sourceB: SAFE_CONTRACT,
    });
    expect(result.verdict).toBe('UNCHANGED');
    expect(result.scoreDelta).toBe(0);
    expect(result.fixedIssues.length).toBe(0);
    expect(result.newIssues.length).toBe(0);
  });

  it('tracks persistent issues correctly', () => {
    const result = runCompare({
      sourceA: MULTI_VULN_CONTRACT,
      sourceB: MULTI_VULN_CONTRACT,
    });
    expect(result.persistentIssues.length).toBeGreaterThan(0);
    expect(result.fixedIssues.length).toBe(0);
    expect(result.newIssues.length).toBe(0);
  });

  it('uses default labels when not provided', () => {
    const result = runCompare({
      sourceA: SAFE_CONTRACT,
      sourceB: SAFE_CONTRACT,
    });
    expect(result.contractA.name).toBe('Version A');
    expect(result.contractB.name).toBe('Version B');
  });
});

// ---------------------------------------------------------------------------
// runBatchScan tests
// ---------------------------------------------------------------------------

describe('runBatchScan', () => {
  it('scans multiple contracts and returns aggregate results', () => {
    const result = runBatchScan([
      { source: SAFE_CONTRACT, name: 'Safe' },
      { source: REENTRANCY_CONTRACT, name: 'Vulnerable' },
    ]);
    expect(result.contracts.length).toBe(2);
    expect(result.avgScore).toBeGreaterThan(0);
    expect(result.worstContract).toBe('Vulnerable');
  });

  it('identifies worst contract correctly', () => {
    const result = runBatchScan([
      { source: SAFE_CONTRACT, name: 'Safe' },
      { source: MULTI_VULN_CONTRACT, name: 'MultiVuln' },
      { source: MINIMAL_CONTRACT, name: 'Minimal' },
    ]);
    expect(result.worstContract).toBe('MultiVuln');
  });

  it('aggregates finding counts across all contracts', () => {
    const result = runBatchScan([
      { source: REENTRANCY_CONTRACT, name: 'A' },
      { source: MULTI_VULN_CONTRACT, name: 'B' },
    ]);
    const total =
      result.totalFindings.critical +
      result.totalFindings.high +
      result.totalFindings.medium +
      result.totalFindings.low +
      result.totalFindings.info;
    expect(total).toBeGreaterThan(0);
  });

  it('returns correct average score', () => {
    const result = runBatchScan([
      { source: SAFE_CONTRACT, name: 'Safe' },
    ]);
    // Single contract: avgScore should equal the contract's score
    expect(result.avgScore).toBe(result.contracts[0]!.score);
  });

  it('handles empty array', () => {
    const result = runBatchScan([]);
    expect(result.contracts.length).toBe(0);
    expect(result.avgScore).toBe(0);
    expect(result.worstContract).toBe('');
  });
});

// ---------------------------------------------------------------------------
// runGasAnalysis tests
// ---------------------------------------------------------------------------

describe('runGasAnalysis', () => {
  it('finds gas issues in gas-heavy contract', () => {
    const result = runGasAnalysis({ sourceCode: GAS_HEAVY_CONTRACT });
    expect(result.totalIssues).toBeGreaterThan(0);
    expect(result.estimatedSavings).toBeGreaterThan(0);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.schemaVersion).toBe(1);
    expect(result.provenance.tool).toBe('lucid-audit');
  });

  it('returns no issues for clean contract', () => {
    const result = runGasAnalysis({ sourceCode: SAFE_CONTRACT });
    expect(result.totalIssues).toBe(0);
    expect(result.estimatedSavings).toBe(0);
  });

  it('each issue has required fields', () => {
    const result = runGasAnalysis({ sourceCode: GAS_HEAVY_CONTRACT });
    for (const issue of result.issues) {
      expect(issue.category).toBeTruthy();
      expect(issue.title).toBeTruthy();
      expect(issue.location).toBeTruthy();
      expect(typeof issue.savings).toBe('number');
      expect(issue.recommendation).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// Formatter tests
// ---------------------------------------------------------------------------

describe('formatAuditResult', () => {
  it('produces human-readable text output', () => {
    const result = runAudit({ sourceCode: REENTRANCY_CONTRACT, contractName: 'Vulnerable' });
    const text = formatAuditResult(result);
    expect(text).toContain('CRITICAL');
    expect(text).toContain('Vulnerable');
    expect(text).toContain('FINDINGS:');
    expect(text).toContain('Provenance:');
  });

  it('compact mode omits vulnerability details', () => {
    const result = runAudit({ sourceCode: REENTRANCY_CONTRACT, contractName: 'Vulnerable' });
    const full = formatAuditResult(result, 'full');
    const compact = formatAuditResult(result, 'compact');
    expect(full.length).toBeGreaterThan(compact.length);
    expect(full).toContain('TOP VULNERABILITIES:');
  });
});

describe('formatCompareResult', () => {
  it('includes delta and trend', () => {
    const result = runCompare({ sourceA: REENTRANCY_CONTRACT, sourceB: FIXED_CONTRACT });
    const text = formatCompareResult(result);
    expect(text).toContain('IMPROVED');
    expect(text).toContain('Delta:');
    expect(text).toContain('FIXED');
  });
});

describe('formatBatchResult', () => {
  it('includes all contract summaries', () => {
    const result = runBatchScan([
      { source: SAFE_CONTRACT, name: 'Safe' },
      { source: REENTRANCY_CONTRACT, name: 'Vulnerable' },
    ]);
    const text = formatBatchResult(result);
    expect(text).toContain('Safe');
    expect(text).toContain('Vulnerable');
    expect(text).toContain('Batch Scan:');
  });
});

describe('formatGasResult', () => {
  it('includes issue details', () => {
    const result = runGasAnalysis({ sourceCode: GAS_HEAVY_CONTRACT });
    const text = formatGasResult(result);
    expect(text).toContain('Gas Analysis:');
    expect(text).toContain('Savings:');
    expect(text).toContain('Fix:');
  });
});

// ---------------------------------------------------------------------------
// Brain tools tests
// ---------------------------------------------------------------------------

describe('createBrainTools', () => {
  const config = {
    supabaseUrl: 'http://localhost:54321',
    supabaseKey: 'test-key',
    tenantId: 'default',
    maxContractSize: 50000,
    scanSchedule: '0 */6 * * *',
  };

  const tools = createBrainTools({ config });

  it('creates exactly 5 brain tools', () => {
    expect(tools.length).toBe(5);
  });

  it('has correct tool names', () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain('lucid_audit');
    expect(names).toContain('lucid_audit_compare');
    expect(names).toContain('lucid_audit_batch');
    expect(names).toContain('lucid_gas');
    expect(names).toContain('lucid_audit_pro');
  });

  it('lucid_audit returns valid JSON result', async () => {
    const tool = tools.find((t) => t.name === 'lucid_audit')!;
    const output = await tool.execute({ source_code: SAFE_CONTRACT, contract_name: 'Safe' });
    const parsed = JSON.parse(output);
    expect(parsed.verdict).toBe('SAFE');
    expect(parsed.schemaVersion).toBe(1);
  });

  it('lucid_audit text format returns readable string', async () => {
    const tool = tools.find((t) => t.name === 'lucid_audit')!;
    const output = await tool.execute({ source_code: SAFE_CONTRACT, format: 'text' });
    expect(output).toContain('PASS');
    expect(output).toContain('SAFE');
  });

  it('lucid_audit compact format excludes details', async () => {
    const tool = tools.find((t) => t.name === 'lucid_audit')!;
    const output = await tool.execute({ source_code: SAFE_CONTRACT, detail: 'compact' });
    const parsed = JSON.parse(output);
    expect(parsed.topVulnerabilities).toBeUndefined();
    expect(parsed.gasAnalysis).toBeUndefined();
    expect(parsed.verdict).toBeDefined();
  });

  it('lucid_audit_compare returns valid JSON', async () => {
    const tool = tools.find((t) => t.name === 'lucid_audit_compare')!;
    const output = await tool.execute({ source_a: REENTRANCY_CONTRACT, source_b: FIXED_CONTRACT });
    const parsed = JSON.parse(output);
    expect(parsed.verdict).toBe('IMPROVED');
    expect(parsed.scoreDelta).toBeGreaterThan(0);
  });

  it('lucid_audit_batch returns valid JSON', async () => {
    const tool = tools.find((t) => t.name === 'lucid_audit_batch')!;
    const output = await tool.execute({
      contracts: [
        { source: SAFE_CONTRACT, name: 'Safe' },
        { source: REENTRANCY_CONTRACT, name: 'Vuln' },
      ],
    });
    const parsed = JSON.parse(output);
    expect(parsed.contracts.length).toBe(2);
    expect(parsed.worstContract).toBe('Vuln');
  });

  it('lucid_audit_batch rejects empty contracts array', async () => {
    const tool = tools.find((t) => t.name === 'lucid_audit_batch')!;
    const output = await tool.execute({ contracts: [] });
    const parsed = JSON.parse(output);
    expect(parsed.error).toBeTruthy();
  });

  it('lucid_gas returns valid JSON', async () => {
    const tool = tools.find((t) => t.name === 'lucid_gas')!;
    const output = await tool.execute({ source_code: GAS_HEAVY_CONTRACT });
    const parsed = JSON.parse(output);
    expect(parsed.totalIssues).toBeGreaterThan(0);
    expect(parsed.schemaVersion).toBe(1);
  });

  it('lucid_audit_pro list_tools returns all detectors', async () => {
    const tool = tools.find((t) => t.name === 'lucid_audit_pro')!;
    const output = await tool.execute({ tool: 'list_tools' });
    const parsed = JSON.parse(output);
    expect(parsed.tools.length).toBeGreaterThanOrEqual(15);
    const names = parsed.tools.map((t: { name: string }) => t.name);
    expect(names).toContain('detect_reentrancy');
    expect(names).toContain('detect_access_control');
    expect(names).toContain('full_vulnerability_scan');
    expect(names).toContain('full_gas_analysis');
    expect(names).toContain('compute_security_score');
  });

  it('lucid_audit_pro runs individual detector', async () => {
    const tool = tools.find((t) => t.name === 'lucid_audit_pro')!;
    const output = await tool.execute({
      tool: 'detect_reentrancy',
      params: { source_code: REENTRANCY_CONTRACT },
    });
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0].category).toBe('reentrancy');
  });

  it('lucid_audit_pro returns error for unknown tool', async () => {
    const tool = tools.find((t) => t.name === 'lucid_audit_pro')!;
    const output = await tool.execute({ tool: 'nonexistent_tool' });
    const parsed = JSON.parse(output);
    expect(parsed.error).toContain('not found');
  });

  it('lucid_audit_pro compute_security_score works', async () => {
    const tool = tools.find((t) => t.name === 'lucid_audit_pro')!;
    const output = await tool.execute({
      tool: 'compute_security_score',
      params: { source_code: SAFE_CONTRACT },
    });
    const score = JSON.parse(output);
    expect(score).toBe(100);
  });

  it('lucid_audit_pro score_to_grade works', async () => {
    const tool = tools.find((t) => t.name === 'lucid_audit_pro')!;
    const output = await tool.execute({
      tool: 'score_to_grade',
      params: { score: 95 },
    });
    const grade = JSON.parse(output);
    expect(grade).toBe('A');
  });
});
