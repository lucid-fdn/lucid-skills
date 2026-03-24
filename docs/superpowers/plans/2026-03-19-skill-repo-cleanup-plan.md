# Lucid-Skills Repo Cleanup Plan (v2 — reviewed)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the lucid-plugins monorepo by eliminating the `skills/` vs `plugins/` duality, standardizing naming, and making each plugin self-contained.

**Architecture:** Merge `skills/` (markdown knowledge) into `plugins/` (TypeScript MCP servers) as co-located `docs/` folders. Each plugin becomes a single self-contained package. Drop OpenClaw-specific files. Add validation before deleting anything.

**Tech Stack:** TypeScript, MCP SDK, tsup, vitest, npm workspaces

---

## Target Structure

```
plugins/
  lucid-trade/
    package.json            # @lucid-fdn/trade
    plugin.json             # Lucid-native metadata (categories, tags, type)
    README.md
    src/                    # TypeScript MCP server
    docs/
      SKILL.md              # Compact control-plane (router, not dump)
      references/           # Detailed sub-area docs
    test/

packages/
  embedded/                 # @lucid-fdn/skills-embedded
  web3-operator/
  web3-types/
  agent-tools-core/

templates/
  plugin-template/          # Updated template

scripts/
  validate-plugin-structure.sh  # Pre-delete validation
```

## Rules

- One plugin = one capability boundary
- One `docs/SKILL.md` = one import entrypoint (compact router, NOT a concat dump)
- References live under `docs/references/`
- No duplicated skill/tool split
- No legacy metadata formats unless actively used
- Template always matches reality
- Two plugin types: `runtime` (has src/) and `docs-only` (no src/, e.g. lucid-defi)

---

### Task 1: Create validation script (run BEFORE any deletions)

**Files:**
- Create: `scripts/validate-plugin-structure.sh`

- [ ] **Step 1: Write validation script**

```bash
#!/bin/bash
set -euo pipefail
ERRORS=0

echo "=== Validating plugin structure ==="

for plugin_dir in plugins/lucid-*; do
  name=$(basename "$plugin_dir")

  # Check package.json exists
  if [ ! -f "$plugin_dir/package.json" ]; then
    echo "ERROR: $name missing package.json"
    ERRORS=$((ERRORS + 1))
  fi

  # Check docs/SKILL.md exists (after merge)
  if [ ! -f "$plugin_dir/docs/SKILL.md" ]; then
    echo "WARN: $name missing docs/SKILL.md"
  fi

  # Check no orphaned OpenClaw files
  for f in skill.yaml openclaw.plugin.json HEARTBEAT.md; do
    if [ -f "$plugin_dir/$f" ]; then
      echo "WARN: $name still has $f (should be removed)"
    fi
  done
done

# Check no orphaned skills/ entries without plugin
if [ -d "skills" ]; then
  for skill_dir in skills/lucid-*; do
    name=$(basename "$skill_dir")
    if [ ! -d "plugins/$name" ]; then
      echo "WARN: skills/$name has no matching plugin (docs-only?)"
    fi
  done
fi

echo ""
if [ $ERRORS -gt 0 ]; then
  echo "FAILED: $ERRORS errors"
  exit 1
else
  echo "PASSED"
fi
```

- [ ] **Step 2: Make executable and test**

```bash
chmod +x scripts/validate-plugin-structure.sh
bash scripts/validate-plugin-structure.sh
```

- [ ] **Step 3: Commit**

---

### Task 2: Merge `skills/` content into `plugins/*/docs/`

- [ ] **Step 1: Write migration script** (`scripts/merge-skills-into-plugins.sh`)

For each `skills/lucid-*`:
- Move `skills/*/skills/` subdirs → `plugins/*/docs/` (as reference material)
- Move `skills/*/README.md` → `plugins/*/README.md` (if plugin lacks one)
- Move `skills/*/test/` → `plugins/*/test/` (merge, don't overwrite)
- Move `skills/*/migrations/` → `plugins/*/migrations/`
- Do NOT move: `skill.yaml`, `openclaw.plugin.json`, `HEARTBEAT.md` (delete in Task 3)

- [ ] **Step 2: Run migration script**

- [ ] **Step 3: Handle lucid-defi (docs-only plugin)**

Create `plugins/lucid-defi/` with `package.json` containing `"type": "docs-only"` and `docs/` folder.

- [ ] **Step 4: Create compact SKILL.md per plugin**

For each plugin, create `docs/SKILL.md` as a **router entrypoint** (NOT a blind concat):

```markdown
---
name: lucid-trade
description: Crypto trading intelligence with brain-layer analysis tools
type: runtime
---

# Lucid Trade

Trading intelligence for AI agents. Provides structured analysis (ThinkResult),
market scanning, risk assessment, and performance review.

## Capabilities
- Deep pair analysis with calibrated verdict (BUY/SELL/WAIT/CLOSE)
- Market opportunity scanning
- Risk protection checks
- Portfolio performance review

## Detailed References
- [Market Analysis](references/market-analysis/SKILL.md)
- [Trading](references/trading/SKILL.md)
- [Portfolio](references/portfolio/SKILL.md)
- [Backtesting](references/backtesting/SKILL.md)
```

Each SKILL.md should be 500-1500 chars max. Sub-area detail stays in `references/`.

- [ ] **Step 5: Run validation**

```bash
bash scripts/validate-plugin-structure.sh
```

- [ ] **Step 6: Commit**

---

### Task 3: Remove OpenClaw artifacts + add Lucid-native plugin.json

- [ ] **Step 1: Delete OpenClaw files from all plugins**

```bash
find plugins/ -name "skill.yaml" -delete
find plugins/ -name "openclaw.plugin.json" -delete
find plugins/ -name "HEARTBEAT.md" -not -path "*/docs/*" -delete
find plugins/ -type d -name ".claude-plugin" -exec rm -rf {} + 2>/dev/null
find plugins/ -name "openclaw.ts" -delete
```

- [ ] **Step 2: Remove openclaw exports from src/index.ts files**

```bash
find plugins/ -path "*/src/index.ts" -exec sed -i '/openclaw/d' {} +
```

- [ ] **Step 3: Add Lucid-native plugin.json per plugin**

Minimal machine-readable metadata for tooling/import/UI:

```json
{
  "id": "lucid-trade",
  "name": "Lucid Trade",
  "version": "5.0.0",
  "type": "runtime",
  "category": "trading",
  "tags": ["crypto", "defi", "trading"],
  "toolCount": 7,
  "brainLayer": true
}
```

For docs-only plugins:
```json
{
  "id": "lucid-defi",
  "name": "Lucid DeFi",
  "version": "1.0.0",
  "type": "docs-only",
  "category": "defi",
  "tags": ["crypto", "defi", "protocols"]
}
```

- [ ] **Step 4: Verify builds**

```bash
cd plugins/lucid-trade && npx tsc --noEmit
cd ../lucid-seo && npx tsc --noEmit
cd ../lucid-audit && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

---

### Task 4: Delete skills/ directory

- [ ] **Step 1: Final validation**

```bash
bash scripts/validate-plugin-structure.sh
```

- [ ] **Step 2: Delete skills/**

```bash
rm -rf skills/
```

- [ ] **Step 3: Update root package.json**

Remove `"skills/*"` from workspaces:
```json
{
  "workspaces": [
    "plugins/*",
    "packages/*"
  ]
}
```

- [ ] **Step 4: Commit**

---

### Task 5: Update template

- [ ] **Step 1: Replace template**

```bash
rm -rf templates/skill-template
mkdir -p templates/plugin-template/{src,docs/references,test}
```

Create `templates/plugin-template/package.json`, `plugin.json`, `docs/SKILL.md`, `src/index.ts`, `src/mcp.ts`.

- [ ] **Step 2: Commit**

---

### Task 6: Update worker import scripts (in LucidMerged repo)

- [ ] **Step 1: Update import paths** to scan `plugins/*/docs/SKILL.md` instead of `skills/*/skills/*/SKILL.md`

- [ ] **Step 2: Test with --dry-run**

- [ ] **Step 3: Commit in LucidMerged repo**

---

### Task 7: Update CLAUDE.md

- [ ] **Step 1: Rewrite CLAUDE.md** to reflect new structure (no `skills/` folder, plugin-only layout, `plugin.json` metadata)

- [ ] **Step 2: Commit**

---

## Summary

| Task | Effort | Impact |
|------|--------|--------|
| 1. Validation script | 10 min | Safety net |
| 2. Merge skills/ into plugins/docs/ | 30 min | Single source of truth |
| 3. Remove OpenClaw + add plugin.json | 15 min | Clean metadata |
| 4. Delete skills/ | 5 min | Eliminate duality |
| 5. Update template | 10 min | Prevent regression |
| 6. Update worker imports | 15 min | Wire to new paths |
| 7. Update CLAUDE.md | 10 min | Documentation |

**Total: ~1.5 hours**
