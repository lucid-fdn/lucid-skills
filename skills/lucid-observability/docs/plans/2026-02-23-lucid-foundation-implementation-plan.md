# Lucid Foundation Phase A+B Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the lucid-sdk CLI tool, then revamp lucid-observability-agent from 16 MCP tools into 7 pure-markdown AgentSkills — the flagship example for all 23 repos.

**Architecture:** Two deliverables: (1) `lucid-sdk` — a Node.js CLI that scaffolds, validates, and generates platform adapters for skill packages from a single `skill.yaml` source of truth. (2) `lucid-observability` — the first skill package, containing 7 skills with full domain knowledge extracted from the existing TypeScript codebase and config JSON. Zero custom code — all API access via official Sentry MCP + Supabase MCP.

**Tech Stack:** Node.js 18+, TypeScript, tsup (SDK build), yaml (parsing), Zod (validation), Commander.js (CLI)

---

## Phase A: lucid-sdk

### Task 1: Initialize lucid-sdk repo

**Files:**
- Create: `C:/lucid-sdk/package.json`
- Create: `C:/lucid-sdk/tsconfig.json`
- Create: `C:/lucid-sdk/tsup.config.ts`
- Create: `C:/lucid-sdk/.gitignore`

**Step 1: Create the repo directory**

Run: `mkdir C:/lucid-sdk && cd C:/lucid-sdk && git init`

**Step 2: Create package.json**

```json
{
  "name": "lucid-sdk",
  "version": "0.1.0",
  "description": "CLI for scaffolding, validating, and publishing Lucid Foundation skill packages",
  "type": "module",
  "bin": {
    "lf": "dist/cli.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "npx tsx src/cli.ts",
    "typecheck": "tsc --noEmit",
    "test": "node --test src/**/*.test.ts"
  },
  "keywords": ["lucid", "agent-skills", "mcp", "openclaw", "claude-code", "cli"],
  "author": "Lucid Foundation",
  "license": "MIT",
  "dependencies": {
    "commander": "^13.0.0",
    "yaml": "^2.7.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "tsup": "^8.5.1",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  },
  "engines": {
    "node": ">=18"
  }
}
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "declaration": true,
    "sourceMap": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

**Step 4: Create tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'node18',
  banner: { js: '#!/usr/bin/env node' },
});
```

**Step 5: Create .gitignore**

```
node_modules/
dist/
*.tsbuildinfo
```

**Step 6: Install dependencies**

Run: `cd C:/lucid-sdk && npm install`

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: initialize lucid-sdk repo"
```

---

### Task 2: Define skill.yaml schema

**Files:**
- Create: `C:/lucid-sdk/src/schema.ts`
- Create: `C:/lucid-sdk/src/schema.test.ts`

**Step 1: Write the test**

```typescript
// src/schema.test.ts
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseSkillYaml } from './schema.js';

describe('parseSkillYaml', () => {
  test('parses valid skill.yaml', () => {
    const raw = {
      lucid: '1.0',
      name: 'lucid-observability',
      version: '4.0.0',
      description: 'Observability triage',
      author: 'Lucid Foundation',
      license: 'MIT',
      requires: { mcps: ['sentry'], env: ['SENTRY_AUTH_TOKEN'] },
      skills: ['triage', 'incident-response'],
      heartbeat: 'HEARTBEAT.md',
      platforms: { 'claude-code': true, openclaw: true },
    };
    const result = parseSkillYaml(raw);
    assert.equal(result.name, 'lucid-observability');
    assert.deepEqual(result.requires.mcps, ['sentry']);
    assert.equal(result.skills.length, 2);
  });

  test('rejects missing name', () => {
    assert.throws(() => parseSkillYaml({ lucid: '1.0' }));
  });

  test('rejects invalid version format', () => {
    assert.throws(() =>
      parseSkillYaml({ lucid: '1.0', name: 'lucid-test', version: 'bad', description: 'x', author: 'x', skills: ['a'] }),
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd C:/lucid-sdk && npx tsx --test src/schema.test.ts`
Expected: FAIL (module not found)

**Step 3: Implement schema**

```typescript
// src/schema.ts
import { z } from 'zod';

const semver = /^\d+\.\d+\.\d+$/;

export const SkillYamlSchema = z.object({
  lucid: z.string().default('1.0'),
  name: z.string().min(1).regex(/^lucid-[a-z0-9-]+$/),
  version: z.string().regex(semver, 'Must be semver (e.g., 1.0.0)'),
  description: z.string().min(1).max(1024),
  author: z.string().min(1),
  license: z.string().default('MIT'),
  requires: z
    .object({
      mcps: z.array(z.string()).default([]),
      env: z.array(z.string()).default([]),
    })
    .default({}),
  skills: z.array(z.string()).min(1),
  heartbeat: z.string().optional(),
  platforms: z
    .record(z.string(), z.boolean())
    .default({ 'claude-code': true, openclaw: true }),
});

export type SkillYaml = z.infer<typeof SkillYamlSchema>;

export function parseSkillYaml(raw: unknown): SkillYaml {
  return SkillYamlSchema.parse(raw);
}
```

**Step 4: Run test to verify it passes**

Run: `cd C:/lucid-sdk && npx tsx --test src/schema.test.ts`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add src/schema.ts src/schema.test.ts && git commit -m "feat: add skill.yaml schema with Zod validation"
```

---

### Task 3: Write `lf init` command

**Files:**
- Create: `C:/lucid-sdk/src/commands/init.ts`
- Create: `C:/lucid-sdk/src/templates/skill-yaml.ts`
- Create: `C:/lucid-sdk/src/templates/skill-md.ts`
- Create: `C:/lucid-sdk/src/templates/heartbeat-md.ts`
- Create: `C:/lucid-sdk/src/templates/readme-md.ts`

**Step 1: Create template files**

```typescript
// src/templates/skill-yaml.ts
export function renderSkillYaml(name: string): string {
  return `lucid: "1.0"
name: ${name}
version: "1.0.0"
description: "TODO: Describe what this skill teaches agents to do"
author: "TODO: Your Name"
license: "MIT"

requires:
  mcps: []
  env: []

skills:
  - main

heartbeat: HEARTBEAT.md

platforms:
  claude-code: true
  openclaw: true
`;
}
```

```typescript
// src/templates/skill-md.ts
export function renderSkillMd(skillName: string): string {
  return `---
name: ${skillName}
description: "TODO: Describe when to use this skill"
version: 1.0.0
---

# ${skillName.charAt(0).toUpperCase() + skillName.slice(1)}

TODO: Write instructions for the AI agent here.

## Prerequisites

List required MCP servers and environment variables.

## Procedure

Step-by-step instructions the agent should follow.
`;
}
```

```typescript
// src/templates/heartbeat-md.ts
export function renderHeartbeatMd(): string {
  return `# Heartbeat Checks

Run these checks periodically. If anything needs attention, report it.
Otherwise reply HEARTBEAT_OK.

## Checklist

- [ ] TODO: Add your first health check
`;
}
```

```typescript
// src/templates/readme-md.ts
export function renderReadmeMd(name: string): string {
  return `# ${name}

A [Lucid Foundation](https://lucid.foundation) skill package.

## Install

### Claude Code
\`\`\`
claude plugin add github:lucid-foundation/${name}
\`\`\`

### OpenClaw
\`\`\`
npm install ${name}
\`\`\`

## Skills

See \`skills/\` directory for available skills.

## License

MIT
`;
}
```

**Step 2: Create init command**

```typescript
// src/commands/init.ts
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { renderSkillYaml } from '../templates/skill-yaml.js';
import { renderSkillMd } from '../templates/skill-md.js';
import { renderHeartbeatMd } from '../templates/heartbeat-md.js';
import { renderReadmeMd } from '../templates/readme-md.js';

export function runInit(name: string, opts: { dir?: string }) {
  const dir = opts.dir || join(process.cwd(), name);

  if (existsSync(dir)) {
    console.error(`Error: ${dir} already exists`);
    process.exit(1);
  }

  mkdirSync(join(dir, 'skills', 'main', 'references'), { recursive: true });

  writeFileSync(join(dir, 'skill.yaml'), renderSkillYaml(name));
  writeFileSync(join(dir, 'skills', 'main', 'SKILL.md'), renderSkillMd('main'));
  writeFileSync(join(dir, 'HEARTBEAT.md'), renderHeartbeatMd());
  writeFileSync(join(dir, 'README.md'), renderReadmeMd(name));
  writeFileSync(join(dir, 'LICENSE'), 'MIT License\n\nCopyright (c) 2026 Lucid Foundation\n');
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name,
        version: '1.0.0',
        description: 'A Lucid Foundation skill package',
        type: 'module',
        license: 'MIT',
        files: ['skills', 'HEARTBEAT.md', 'skill.yaml', 'README.md', 'LICENSE'],
      },
      null,
      2,
    ) + '\n',
  );

  console.log(`Created ${name} at ${dir}`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${name}`);
  console.log(`  # Edit skill.yaml and skills/main/SKILL.md`);
  console.log(`  lf validate`);
  console.log(`  lf adapt`);
}
```

**Step 3: Commit**

```bash
git add src/commands/init.ts src/templates/ && git commit -m "feat: add lf init command with scaffolding templates"
```

---

### Task 4: Write `lf validate` command

**Files:**
- Create: `C:/lucid-sdk/src/commands/validate.ts`
- Create: `C:/lucid-sdk/src/commands/validate.test.ts`

**Step 1: Write the test**

```typescript
// src/commands/validate.test.ts
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateSkillPackage } from './validate.js';

describe('validateSkillPackage', () => {
  test('reports missing skill.yaml', () => {
    const result = validateSkillPackage('/nonexistent');
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('skill.yaml')));
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd C:/lucid-sdk && npx tsx --test src/commands/validate.test.ts`

**Step 3: Implement validate**

```typescript
// src/commands/validate.ts
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { SkillYamlSchema } from '../schema.js';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSkillPackage(dir: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check skill.yaml exists and parses
  const yamlPath = join(dir, 'skill.yaml');
  if (!existsSync(yamlPath)) {
    errors.push('Missing skill.yaml in package root');
    return { valid: false, errors, warnings };
  }

  let config;
  try {
    const raw = parseYaml(readFileSync(yamlPath, 'utf-8'));
    config = SkillYamlSchema.parse(raw);
  } catch (e) {
    errors.push(`Invalid skill.yaml: ${e instanceof Error ? e.message : String(e)}`);
    return { valid: false, errors, warnings };
  }

  // 2. Check each declared skill has SKILL.md
  for (const skill of config.skills) {
    const skillDir = join(dir, 'skills', skill);
    const skillMd = join(skillDir, 'SKILL.md');

    if (!existsSync(skillDir)) {
      errors.push(`Declared skill "${skill}" has no directory at skills/${skill}/`);
      continue;
    }
    if (!existsSync(skillMd)) {
      errors.push(`Declared skill "${skill}" missing SKILL.md at skills/${skill}/SKILL.md`);
      continue;
    }

    const content = readFileSync(skillMd, 'utf-8');
    if (!content.startsWith('---')) {
      warnings.push(`skills/${skill}/SKILL.md missing YAML frontmatter`);
    }

    const lines = content.split('\n').length;
    if (lines > 500) {
      warnings.push(`skills/${skill}/SKILL.md has ${lines} lines (recommended <500)`);
    }
  }

  // 3. Check HEARTBEAT.md if declared
  if (config.heartbeat && !existsSync(join(dir, config.heartbeat))) {
    errors.push(`Declared heartbeat file "${config.heartbeat}" not found`);
  }

  // 4. Security checks on all markdown files
  const allMdFiles = findMdFiles(join(dir, 'skills'));
  for (const file of allMdFiles) {
    const content = readFileSync(file, 'utf-8');
    if (/(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]+['"]/i.test(content)) {
      errors.push(`Possible hardcoded credential in ${file}`);
    }
  }

  // 5. Check package.json exists
  if (!existsSync(join(dir, 'package.json'))) {
    warnings.push('Missing package.json — needed for npm publishing');
  }

  return { valid: errors.length === 0, errors, warnings };
}

function findMdFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...findMdFiles(full));
    else if (entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}

export function runValidate(dir: string) {
  const result = validateSkillPackage(dir);

  for (const err of result.errors) {
    console.error(`  ERROR: ${err}`);
  }
  for (const warn of result.warnings) {
    console.warn(`  WARN: ${warn}`);
  }

  if (result.valid) {
    console.log(`\nValid skill package (${result.warnings.length} warnings)`);
  } else {
    console.error(`\nInvalid — ${result.errors.length} errors`);
    process.exit(1);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd C:/lucid-sdk && npx tsx --test src/commands/validate.test.ts`

**Step 5: Commit**

```bash
git add src/commands/validate.ts src/commands/validate.test.ts && git commit -m "feat: add lf validate command with security checks"
```

---

### Task 5: Write platform adapters

**Files:**
- Create: `C:/lucid-sdk/src/adapters/claude-code.ts`
- Create: `C:/lucid-sdk/src/adapters/openclaw.ts`
- Create: `C:/lucid-sdk/src/adapters/index.ts`

**Step 1: Write Claude Code adapter**

```typescript
// src/adapters/claude-code.ts
import type { SkillYaml } from '../schema.js';

export function generateClaudeCodeManifest(config: SkillYaml): Record<string, unknown> {
  return {
    name: config.name,
    description: config.description,
    version: config.version,
  };
}

export function claudeCodeOutputPath(): string {
  return '.claude-plugin/plugin.json';
}
```

**Step 2: Write OpenClaw adapter**

```typescript
// src/adapters/openclaw.ts
import type { SkillYaml } from '../schema.js';

export function generateOpenClawManifest(config: SkillYaml): Record<string, unknown> {
  return {
    id: config.name,
    name: config.name,
    version: config.version,
    description: config.description,
    skills: config.skills.map((s) => `skills/${s}`),
  };
}

export function openclawOutputPath(): string {
  return 'openclaw.plugin.json';
}
```

**Step 3: Write adapter index**

```typescript
// src/adapters/index.ts
export { generateClaudeCodeManifest, claudeCodeOutputPath } from './claude-code.js';
export { generateOpenClawManifest, openclawOutputPath } from './openclaw.js';
```

**Step 4: Commit**

```bash
git add src/adapters/ && git commit -m "feat: add Claude Code and OpenClaw adapters"
```

---

### Task 6: Write `lf adapt` command

**Files:**
- Create: `C:/lucid-sdk/src/commands/adapt.ts`

**Step 1: Implement adapt**

```typescript
// src/commands/adapt.ts
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { parseSkillYaml } from '../schema.js';
import {
  generateClaudeCodeManifest,
  claudeCodeOutputPath,
  generateOpenClawManifest,
  openclawOutputPath,
} from '../adapters/index.js';

interface AdaptOptions {
  only?: string;
}

const adapters: Record<string, { generate: (c: any) => unknown; outputPath: () => string }> = {
  'claude-code': { generate: generateClaudeCodeManifest, outputPath: claudeCodeOutputPath },
  openclaw: { generate: generateOpenClawManifest, outputPath: openclawOutputPath },
};

export function runAdapt(dir: string, opts: AdaptOptions) {
  const yamlPath = join(dir, 'skill.yaml');
  if (!existsSync(yamlPath)) {
    console.error('Error: skill.yaml not found');
    process.exit(1);
  }

  const raw = parseYaml(readFileSync(yamlPath, 'utf-8'));
  const config = parseSkillYaml(raw);

  const platformsToGenerate = opts.only
    ? [opts.only]
    : Object.keys(config.platforms).filter((p) => config.platforms[p]);

  let generated = 0;
  for (const platform of platformsToGenerate) {
    const adapter = adapters[platform];
    if (!adapter) {
      console.warn(`  WARN: No adapter for platform "${platform}" — skipping`);
      continue;
    }

    const manifest = adapter.generate(config);
    const outPath = join(dir, adapter.outputPath());
    const outDir = dirname(outPath);

    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`  ${platform} -> ${adapter.outputPath()}`);
    generated++;
  }

  console.log(`\nGenerated ${generated} platform manifest(s)`);
}
```

**Step 2: Commit**

```bash
git add src/commands/adapt.ts && git commit -m "feat: add lf adapt command for platform manifest generation"
```

---

### Task 7: Wire up CLI entry point

**Files:**
- Create: `C:/lucid-sdk/src/cli.ts`

**Step 1: Implement CLI**

```typescript
// src/cli.ts
import { Command } from 'commander';
import { runInit } from './commands/init.js';
import { runValidate } from './commands/validate.js';
import { runAdapt } from './commands/adapt.js';

const program = new Command();

program
  .name('lf')
  .description('Lucid Foundation SDK — scaffold, validate, and adapt skill packages')
  .version('0.1.0');

program
  .command('init <name>')
  .description('Scaffold a new lucid-* skill package')
  .option('-d, --dir <path>', 'Output directory')
  .action((name: string, opts) => {
    if (!name.startsWith('lucid-')) {
      name = `lucid-${name}`;
    }
    runInit(name, opts);
  });

program
  .command('validate')
  .description('Validate skill package (skill.yaml, SKILL.md files, security)')
  .option('-d, --dir <path>', 'Package directory', '.')
  .action((opts) => {
    runValidate(opts.dir);
  });

program
  .command('adapt')
  .description('Generate platform manifests from skill.yaml')
  .option('-d, --dir <path>', 'Package directory', '.')
  .option('--only <platform>', 'Generate only for one platform')
  .action((opts) => {
    runAdapt(opts.dir, { only: opts.only });
  });

program.parse();
```

**Step 2: Build and test**

Run: `cd C:/lucid-sdk && npm run build`
Expected: dist/cli.js created

Run: `cd C:/lucid-sdk && node dist/cli.js --help`
Expected: Shows lf commands (init, validate, adapt)

**Step 3: Test end-to-end**

Run:
```bash
cd /tmp && node C:/lucid-sdk/dist/cli.js init test-skill && ls lucid-test-skill/ && node C:/lucid-sdk/dist/cli.js validate -d lucid-test-skill && node C:/lucid-sdk/dist/cli.js adapt -d lucid-test-skill && cat lucid-test-skill/openclaw.plugin.json && rm -rf lucid-test-skill
```

Expected: All commands succeed, manifests generated correctly

**Step 4: Commit**

```bash
git add src/cli.ts && git commit -m "feat: wire up CLI entry point with init, validate, adapt commands"
```

---

### Task 8: Add README and publish setup

**Files:**
- Create: `C:/lucid-sdk/README.md`

**Step 1: Write README** covering install, commands (init, validate, adapt), and link to lucid.foundation.

**Step 2: Final build + typecheck**

Run: `cd C:/lucid-sdk && npm run typecheck && npm run build`

**Step 3: Commit + tag**

```bash
git add README.md && git commit -m "docs: add README"
git tag v0.1.0
```

---

## Phase B: lucid-observability revamp

### Task 9: Create new package structure

**Files:**
- Create: `C:/lucid-observability-agent/skill.yaml`

**Step 1: Create skill.yaml**

```yaml
lucid: "1.0"
name: lucid-observability
version: "4.0.0"
description: "Production observability triage, incident response, cross-service correlation, billing health monitoring, and OTel convention enforcement"
author: "Lucid Foundation"
license: "MIT"

requires:
  mcps:
    - sentry
    - supabase
  env:
    - SENTRY_AUTH_TOKEN
    - SENTRY_ORG

skills:
  - triage
  - incident-response
  - correlation
  - billing-health
  - conventions
  - production-readiness
  - alerting

heartbeat: HEARTBEAT.md

platforms:
  claude-code: true
  openclaw: true
```

**Step 2: Commit**

```bash
git add skill.yaml && git commit -m "feat: add skill.yaml for v4.0.0 skill package format"
```

---

### Task 10: Write triage skill

This is the largest skill — migrates 6 Sentry tools + diagnosis tool + temporal pattern detection + known bugs.

**Files:**
- Create: `C:/lucid-observability-agent/skills/triage/SKILL.md`
- Create: `C:/lucid-observability-agent/skills/triage/references/diagnosis-patterns.md`
- Create: `C:/lucid-observability-agent/skills/triage/references/temporal-patterns.md`
- Create: `C:/lucid-observability-agent/skills/triage/references/known-bugs.md`
- Create: `C:/lucid-observability-agent/skills/triage/references/severity-matrix.md`

**Step 1: Write SKILL.md** with:
- YAML frontmatter (name: triage, description, requires mcps: [sentry])
- Prerequisites: official Sentry MCP tools to use (list_issues, get_issue_details, list_issue_events, update_issue)
- Triage Procedure — 6 steps from existing triage-issue prompt:
  1. Get issue details (stack trace, tags, breadcrumbs) — focus on last 15 frames, prioritize in-app frames
  2. Get recent events (last 25) to analyze temporal pattern — classify as burst/steady/regression/sporadic per references/temporal-patterns.md
  3. Check for trace_id, run_id, service tags for cross-service correlation
  4. Match against diagnosis patterns (references/diagnosis-patterns.md) — check Lucid-specific patterns first, then built-in
  5. Check known bugs (references/known-bugs.md) — if match found with fixed:true, recommend the specific fix
  6. Score severity per references/severity-matrix.md and recommend action
- Breadcrumb analysis: limit to last 10 breadcrumbs
- Issue resolution guidance: when to resolve/ignore/unresolve
- Stats interpretation: how to use Sentry project stats for error rate trend analysis (received/rejected/blacklisted, interval 1h/1d, period 7d/14d)

**Step 2: Write references/diagnosis-patterns.md** containing ALL patterns:
- 8 built-in categories with exact keyword lists:
  - network_error: fetch failed, econnrefused, enotfound, econnreset, network
  - timeout: timeout, aborterror, abort, deadline
  - auth_error: unauthorized, 401, 403, forbidden, auth
  - rate_limit: rate, 429, quota, too many
  - database_error: database, postgres, unique constraint, deadlock, connection
  - validation_error: validation, zod, parse, schema
  - memory_leak: heap, out of memory, oom
  - application_error: (fallback if no other match)
- 4 Lucid-specific patterns from config/lucid.json diagnosisPatterns:
  - litellm_timeout: keywords [litellm, timeout, llm proxy], root cause "LLM provider timeout via LiteLLM", suggestions [check LiteLLM fallback routes, switch to streaming]
  - openmeter_timeout: keywords [openmeter, metering, outbox, aborterror], root cause "OpenMeter API timeout — verify timeout is 5000ms (known 30ms bug)", suggestions [verify timeoutMs=5000, check outbox health]
  - privy_auth: keywords [privy, auth.privy.io], root cause "Privy authentication failure", suggestions [verify NEXT_PUBLIC_PRIVY_APP_ID and Privy status]
  - mcp_server_down: keywords [mcp, tool_execute, econnrefused, mcp server], root cause "MCP server unreachable", suggestions [check health endpoint, verify MCPGate registry]
- Matching rule: case-insensitive substring match on title + culprit + stacktrace. Check Lucid-specific first, then built-in.

**Step 3: Write references/temporal-patterns.md** with full algorithm:
- Burst: 80%+ of events in first 20% of timespan. Requires >1 hour total span. Indicates: likely deployment or config change.
- Steady: Coefficient of variation <0.5 across inter-event gaps. Requires >=5 events. Indicates: systemic issue.
- Regression: Max gap between consecutive events >5x average gap. Requires >=3 events. Indicates: reintroduced bug.
- Sporadic: None of the above patterns match. Indicates: edge case or race condition.
- Unknown: <2 events. Cannot determine pattern.

**Step 4: Write references/known-bugs.md** with all known bugs:
- openmeter-30ms: Title "OpenMeter client 30ms timeout". Keywords: openmeter, aborterror, timeout, 30. Description: "The OpenMeter client had timeoutMs=30 instead of 5000, causing silent AbortErrors in production." Fix: "Fixed in packages/metering/src/client.ts — verify timeoutMs=5000." Status: FIXED.
- Template section for adding new known bugs with required fields (id, title, keywords, description, fix, fixed status)

**Step 5: Write references/severity-matrix.md** with scoring system:
- CRITICAL: level=fatal OR count>1000 OR (count>100 AND last activity <1 hour ago)
- HIGH: level=error AND (count>100 OR userCount>10)
- MEDIUM: level=error AND count>10
- LOW: everything else
- Recommended actions per severity: critical=immediate escalation/rollback, high=link to deploy diff/suggest revert, medium=create investigation ticket, low=monitor/auto-resolve if <5 occurrences/day

**Step 6: Commit**

```bash
git add skills/triage/ && git commit -m "feat: add triage skill with diagnosis patterns, temporal analysis, severity scoring"
```

---

### Task 11: Write incident-response skill

Migrates generate_runbook (all 10 categories x 5 phases) + incident-response prompt.

**Files:**
- Create: `C:/lucid-observability-agent/skills/incident-response/SKILL.md`
- Create: `C:/lucid-observability-agent/skills/incident-response/references/runbooks/network-error.md`
- Create: `C:/lucid-observability-agent/skills/incident-response/references/runbooks/timeout.md`
- Create: `C:/lucid-observability-agent/skills/incident-response/references/runbooks/auth-error.md`
- Create: `C:/lucid-observability-agent/skills/incident-response/references/runbooks/rate-limit.md`
- Create: `C:/lucid-observability-agent/skills/incident-response/references/runbooks/database-error.md`
- Create: `C:/lucid-observability-agent/skills/incident-response/references/runbooks/validation-error.md`
- Create: `C:/lucid-observability-agent/skills/incident-response/references/runbooks/metering-failure.md`
- Create: `C:/lucid-observability-agent/skills/incident-response/references/runbooks/provider-outage.md`
- Create: `C:/lucid-observability-agent/skills/incident-response/references/runbooks/memory-leak.md`
- Create: `C:/lucid-observability-agent/skills/incident-response/references/runbooks/deployment-regression.md`

**Step 1: Write SKILL.md** with 4-phase incident response workflow (assess, diagnose, mitigate, document) referencing official Sentry MCP and Supabase MCP tools. Include category selection guide to pick the right runbook.

**Step 2: Write each runbook file** — one per category with exact content from config/lucid.json runbooks section. Each file has: title, severity, and 5 phases (triage, diagnose, mitigate, resolve, postmortem). Replace tool references (e.g., "use openmeter_outbox_health") with instructions to use official MCPs (e.g., "use Supabase MCP to run the outbox health query from billing-health skill").

All 10 runbook files must be created with FULL content from config/lucid.json:
1. network-error.md (HIGH) — ECONNREFUSED/ENOTFOUND/ETIMEDOUT patterns
2. timeout.md (MEDIUM-HIGH) — LLM timeouts, DB pool, streaming
3. auth-error.md (HIGH) — 401/403, key rotation, tenant impact
4. rate-limit.md (MEDIUM) — quota checks, spike detection, provider limits
5. database-error.md (CRITICAL) — connection pool, migrations, long queries
6. validation-error.md (LOW-MEDIUM) — schema mismatch, API versioning
7. metering-failure.md (HIGH) — outbox health, dead letters, 30ms bug
8. provider-outage.md (HIGH) — fallback routing, degraded mode
9. memory-leak.md (CRITICAL) — heap snapshots, OOM kills, --max-old-space-size
10. deployment-regression.md (HIGH) — error rate comparison, canary, feature flags

**Step 3: Commit**

```bash
git add skills/incident-response/ && git commit -m "feat: add incident-response skill with 10 runbook categories"
```

---

### Task 12: Write correlation skill

Migrates cross_correlate + sentry_search_by_trace + service topology.

**Files:**
- Create: `C:/lucid-observability-agent/skills/correlation/SKILL.md`
- Create: `C:/lucid-observability-agent/skills/correlation/references/services.md`
- Create: `C:/lucid-observability-agent/skills/correlation/references/trace-flow.md`

**Step 1: Write SKILL.md** with:
- Cross-service correlation procedure using Sentry MCP search with query `trace_id:{id}` or `run_id:{id}`
- Batch strategy: search 6 projects at a time to avoid rate limits
- Projects to search: lucid-web, lucid-worker, lucid-l2, lucid-trustgate, lucid-mcpgate, javascript-nextjs
- Cascade detection: if >1 service has errors for same trace, flag as cascade
- Deduplication by issue ID across projects
- Timeline sort by lastSeen (newest first)
- Hint: "No errors found? Verify enrichSentryEvent() is called in beforeSend to attach trace_id/run_id tags"

**Step 2: Write references/services.md** with full service topology from config/lucid.json:
- 6 services: lucid-web (Next.js/Vercel/LucidMerged), lucid-worker (Fastify/Railway/LucidMerged), lucid-l2 (Express/Railway/Lucid-L2), lucid-trustgate (Fastify/Railway/lucid-plateform-core), lucid-mcpgate (Fastify/Railway/lucid-plateform-core), lucid-control-plane (Fastify/Railway/lucid-plateform-core)
- Full dependency graph from config

**Step 3: Write references/trace-flow.md** with 4 trace flow paths and propagation rules from config.

**Step 4: Commit**

```bash
git add skills/correlation/ && git commit -m "feat: add correlation skill with service topology and trace flow"
```

---

### Task 13: Write billing-health skill

Migrates 4 OpenMeter tools with exact SQL.

**Files:**
- Create: `C:/lucid-observability-agent/skills/billing-health/SKILL.md`
- Create: `C:/lucid-observability-agent/skills/billing-health/references/outbox-queries.md`
- Create: `C:/lucid-observability-agent/skills/billing-health/references/usage-queries.md`
- Create: `C:/lucid-observability-agent/skills/billing-health/references/anomaly-detection.md`
- Create: `C:/lucid-observability-agent/skills/billing-health/references/thresholds.md`

**Step 1: Write SKILL.md** with metering pipeline monitoring procedure and instructions to use Supabase MCP for SQL execution.

**Step 2: Write references/outbox-queries.md** with ALL SQL from openmeter_outbox_health and openmeter_dead_letter_retry tools. Table: openmeter_event_ledger. Include: pending/sent/dead-letter/leased/stuck counts, throughput hourly buckets, top errors, dead letter retry UPDATE.

**Step 3: Write references/usage-queries.md** with ALL SQL from openmeter_usage_by_org. LLM usage (feature='chat_completion') grouped by org/provider/model. Other usage grouped by org/service/feature.

**Step 4: Write references/anomaly-detection.md** with the algorithm from openmeter_usage_anomaly: recent vs baseline window comparison, ratio calculation, spike threshold (3x), drop detection.

**Step 5: Write references/thresholds.md** with all magic numbers: queue depth 500, dead letter 10, stuck lease 5min, spike 3x, max retry batch 500, PG pool max 3, PG idle 30s.

**Step 6: Commit**

```bash
git add skills/billing-health/ && git commit -m "feat: add billing-health skill with outbox SQL and anomaly detection"
```

---

### Task 14: Write conventions skill

Migrates check_conventions + resources.

**Files:**
- Create: `C:/lucid-observability-agent/skills/conventions/SKILL.md`
- Create: `C:/lucid-observability-agent/skills/conventions/references/span-names.md`
- Create: `C:/lucid-observability-agent/skills/conventions/references/attributes.md`
- Create: `C:/lucid-observability-agent/skills/conventions/references/sampling.md`

**Step 1: Write SKILL.md** with 6 convention rules from config.

**Step 2: Write references/span-names.md** with ALL 20 span names and descriptions from config.

**Step 3: Write references/attributes.md** with ALL 19 attribute keys with description, pii flag, highCardinality flag from config.

**Step 4: Write references/sampling.md** with head rates (prod 0.1, staging 1.0, dev 1.0, test 0.0), tail rules (100% errors, 100% >p99, 100% status=ERROR), override mechanism (OTEL_TRACES_SAMPLER_ARG).

**Step 5: Commit**

```bash
git add skills/conventions/ && git commit -m "feat: add conventions skill with span names, attributes, sampling"
```

---

### Task 15: Write production-readiness skill

**Files:**
- Create: `C:/lucid-observability-agent/skills/production-readiness/SKILL.md`

**Step 1: Write SKILL.md** with full env var checklist (SENTRY_DSN, SENTRY_AUTH_TOKEN, OTEL_ENABLED, OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_HASH_SALT, OPENMETER_ENABLED, OPENMETER_API_KEY, DATABASE_URL, LUCID_ENV), pass/warn/fail criteria per check, production-specific rules, scoring formula (passing/total x 100), production ready threshold (0 failures AND >=70%), and the 6-step production readiness audit workflow.

**Step 2: Commit**

```bash
git add skills/production-readiness/ && git commit -m "feat: add production-readiness skill with env var checklist"
```

---

### Task 16: Write alerting skill

**Files:**
- Create: `C:/lucid-observability-agent/skills/alerting/SKILL.md`

**Step 1: Write SKILL.md** with 5 alert rule templates, frequency heuristic (20% of current count), action mapping (error->Slack, critical->PagerDuty), instructions for using Sentry MCP to fetch top issues.

**Step 2: Commit**

```bash
git add skills/alerting/ && git commit -m "feat: add alerting skill with rule templates and heuristics"
```

---

### Task 17: Write HEARTBEAT.md

**Files:**
- Create: `C:/lucid-observability-agent/HEARTBEAT.md`

**Step 1: Write HEARTBEAT.md** with 4 autonomous checks:
1. Outbox Health — use Supabase MCP for outbox query, alert if dead letters >0 or stuck leases or queue >500 or zero throughput
2. Error Spike Detection — use Sentry MCP list_issues sorted by freq, alert if count>100 or fatal unresolved or regression flagged
3. Config Health — check critical env vars are set
4. Diagnosis — if issues found, follow triage skill procedure, classify severity, report

**Step 2: Commit**

```bash
git add HEARTBEAT.md && git commit -m "feat: add HEARTBEAT.md for autonomous monitoring"
```

---

### Task 18: Run lf validate + lf adapt

**Step 1: Validate**

Run: `cd C:/lucid-observability-agent && node C:/lucid-sdk/dist/cli.js validate`
Expected: Valid skill package. Fix any errors.

**Step 2: Generate adapters**

Run: `cd C:/lucid-observability-agent && node C:/lucid-sdk/dist/cli.js adapt`
Expected: Generated claude-code and openclaw manifests.

**Step 3: Commit generated manifests**

```bash
git add .claude-plugin/ openclaw.plugin.json && git commit -m "chore: generate platform manifests via lf adapt"
```

---

### Task 19: Delete all TypeScript and clean up

**Step 1: Delete code and build artifacts**

Run: `cd C:/lucid-observability-agent && rm -rf src/ dist/ tsconfig.json tsup.config.ts config/ skills/lucid-observability/`

**Step 2: Rewrite package.json** — remove all scripts, dependencies, devDependencies, exports, bin. Keep only: name (lucid-observability), version (4.0.0), description, type, license, author, repository, keywords, files (skills, HEARTBEAT.md, skill.yaml, .claude-plugin, openclaw.plugin.json, README.md, LICENSE). Zero dependencies.

**Step 3: Remove package-lock.json and node_modules**

Run: `cd C:/lucid-observability-agent && rm -rf node_modules/ package-lock.json`

**Step 4: Commit**

```bash
git add -A && git commit -m "feat!: v4.0.0 — pure AgentSkills package, delete all TypeScript

BREAKING CHANGE: Removed all 16 MCP tools. This package is now pure
markdown skill files. Use official Sentry MCP + Supabase MCP for API access."
```

---

### Task 20: Update README and tag

**Step 1: Rewrite README.md** for v4.0.0:
- What this is (Lucid Foundation skill package for observability)
- Installation for Claude Code and OpenClaw
- Prerequisites: official Sentry MCP + Supabase MCP
- List of 7 skills with brief descriptions
- HEARTBEAT.md for autonomous monitoring
- Link to lucid.foundation and lucid-sdk

**Step 2: Commit + tag**

```bash
git add README.md && git commit -m "docs: update README for v4.0.0 skill package"
git tag v4.0.0
```

---

### Task 21: Verify end-to-end

**Step 1:** Run `lf validate` — should pass with 0 errors.

**Step 2:** Verify zero code files: `find . -name '*.ts' -o -name '*.js' | grep -v node_modules` — should return nothing.

**Step 3:** Verify markdown count: `find ./skills -name '*.md' | wc -l` — should be 20+ files.

**Step 4:** Verify publishable: `npm pack --dry-run` — should list only content files (no src/, dist/, config/).

---

## Summary

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| A (SDK) | 1-8 | `lucid-sdk` v0.1.0 — CLI with init, validate, adapt |
| B (Flagship) | 9-21 | `lucid-observability` v4.0.0 — 7 skills, pure markdown, zero code |

**After this plan:** The remaining 22 repos follow the same pattern. For each: `lf init`, extract domain knowledge into skills, run `lf validate`, run `lf adapt`, delete TypeScript, commit.
