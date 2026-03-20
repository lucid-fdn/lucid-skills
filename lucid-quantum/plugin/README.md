# lucid-quantum

Bitcoin quantum-safe key search intelligence plugin for OpenClaw and Claude Code.

## Skills

| Skill | Description |
|-------|-------------|
| **fleet-management** | GPU fleet orchestration, worker monitoring, throughput tracking |
| **target-intelligence** | Target classification, vulnerability scoring, temporal narrowing |
| **brain-wallet** | Brain wallet strategy management, batch submission, performance tracking |
| **mode-optimization** | Auto-optimize mode priorities from triage + fingerprint intelligence |
| **research** | Wallet fingerprinting, address clustering, vulnerability research |

## Brain Tools (9)

| Tool | Description |
|------|-------------|
| `quantum_fleet` | Fleet status: workers, throughput, mode health |
| `quantum_triage` | Target classification with per-mode vulnerability scores |
| `quantum_fingerprint` | Wallet software identification from tx patterns |
| `quantum_optimize` | Auto-optimize priorities from intelligence data |
| `quantum_narrow` | Temporal narrowing for 300x speedup |
| `quantum_brain` | Brain wallet strategy evaluation |
| `quantum_cost` | GPU cost efficiency analysis |
| `quantum_protect` | Fleet health monitoring |
| `quantum_review` | Performance review and recommendations |

## OpenClaw Playbooks (4)

| Playbook | Schedule | Description |
|----------|----------|-------------|
| fleet-optimization-loop | Hourly | Health -> Triage -> Optimize -> Cost -> Review |
| target-analysis-pipeline | On target update | Classify -> Fingerprint -> Narrow -> Optimize |
| brain-wallet-evolution | Weekly | Strategy review -> Scale/Retire -> Recommend new |
| continuous-monitoring | Every 15min | Quick health check with escalation |

## Memory Integration

Persistent agent learning via `QuantumMemory`:
- Fleet state snapshots (trend analysis)
- Strategy results (hit rate evolution)
- Optimization history (speedup tracking)
- Fingerprint knowledge (accumulated identifications)

## Setup

```bash
npm install
npm run build
```

### Environment Variables

```bash
BQ_API_URL=https://api.b4q.io    # Before Quantum API URL
BQ_API_KEY=bq_xxxxxxxxxxxx       # API key for authentication
BQ_ADMIN_SECRET=your_secret      # Admin secret for write operations
QUANTUM_AGENT_PASSPORT_ID=...    # Optional: agent identity for credit tracking
QUANTUM_MEMORY_DIR=./memory      # Optional: directory for persistent memory
QUANTUM_LOG_LEVEL=info           # debug | info | warn | error
```

### Run as MCP Server

```bash
BQ_API_URL=https://api.b4q.io BQ_API_KEY=bq_xxx npx quantum-mcp
```

### Use in Claude Code

Add to your `.claude/settings.json`:
```json
{
  "mcpServers": {
    "quantum": {
      "command": "npx",
      "args": ["quantum-mcp"],
      "env": {
        "BQ_API_URL": "https://api.b4q.io",
        "BQ_API_KEY": "bq_xxxxxxxxxxxx"
      }
    }
  }
}
```

## License

MIT
