/**
 * Extract real tool manifests from all 18 MCP skill factories.
 *
 * Uses dynamic imports with explicit paths to avoid ESM exports resolution issues.
 *
 * Usage:
 *   cd /c/lucid-plugins
 *   npx tsx scripts/extract-tool-manifests.ts > tool-manifests.json
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { resolve } from 'path'
import { pathToFileURL } from 'url'

// Set dummy env vars so skill factories can construct their McpServer
// (tools are registered at construction time, no actual DB calls needed for listTools)
const SKILL_PREFIXES = [
  'AUDIT', 'BRIDGE', 'COMPETE', 'FEEDBACK', 'HYPE', 'INVOICE',
  'MEET', 'METRICS', 'OBSERVABILITY', 'PREDICT', 'PROPOSE',
  'PROSPECT', 'QUANTUM', 'RECRUIT', 'SEO', 'TAX', 'TRADE',
  'VEILLE', 'VIDEO',
]
for (const prefix of SKILL_PREFIXES) {
  process.env[`${prefix}_SUPABASE_URL`] ??= 'https://dummy.supabase.co'
  process.env[`${prefix}_SUPABASE_KEY`] ??= 'dummy-key'
  process.env[`${prefix}_SUPABASE_ANON_KEY`] ??= 'dummy-key'
  process.env[`${prefix}_TENANT_ID`] ??= 'dummy-tenant'
}
// Additional env vars some skills check
process.env.NOTION_TOKEN ??= 'dummy'
process.env.LINEAR_TOKEN ??= 'dummy'
process.env.SLACK_BOT_TOKEN ??= 'dummy'
process.env.GITHUB_TOKEN ??= 'dummy'

const SKILLS = [
  'lucid-audit',
  'lucid-bridge',
  'lucid-compete',
  'lucid-feedback',
  'lucid-hype',
  'lucid-invoice',
  'lucid-meet',
  'lucid-metrics',
  'lucid-observability',
  'lucid-predict',
  'lucid-propose',
  'lucid-prospect',
  'lucid-quantum',
  'lucid-recruit',
  'lucid-seo',
  'lucid-tax',
  'lucid-trade',
  'lucid-veille',
  'lucid-video',
] as const

// Derive factory name from slug: lucid-seo → createSeoServer
function factoryName(slug: string): string {
  const name = slug.replace('lucid-', '')
  return `create${name.charAt(0).toUpperCase()}${name.slice(1)}Server`
}

interface ToolManifest {
  slug: string
  tools: Array<{
    name: string
    description: string
    inputSchema: Record<string, unknown>
  }>
  error?: string
}

async function extractManifest(slug: string): Promise<ToolManifest> {
  try {
    // Import directly from the skill's src/mcp.ts via tsx
    const mcpPath = resolve(__dirname, '..', 'skills', slug, 'src', 'mcp.ts')
    const mod = await import(pathToFileURL(mcpPath).href)
    const fname = factoryName(slug)
    const factory = mod[fname]
    if (!factory) {
      return { slug, tools: [], error: `No export '${fname}' found` }
    }

    // Some factories (e.g. lucid-tax) take a config object from loadConfig()
    let server: { connect(t: unknown): Promise<void> }
    if (factory.length > 0) {
      // Factory expects args — try to load config from the skill's config loader
      try {
        const configPath = resolve(__dirname, '..', 'skills', slug, 'src', 'core', 'config', 'loader.ts')
        const configMod = await import(pathToFileURL(configPath).href)
        server = factory(configMod.loadConfig()) as typeof server
      } catch {
        // Fallback: pass empty env-constructed config
        server = factory({}) as typeof server
      }
    } else {
      server = factory() as typeof server
    }
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    const client = new Client({ name: 'manifest-extractor', version: '1.0.0' })
    await client.connect(clientTransport)

    const { tools } = await client.listTools()
    await client.close()

    return {
      slug,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description ?? '',
        inputSchema: t.inputSchema as Record<string, unknown>,
      })),
    }
  } catch (err) {
    return {
      slug,
      tools: [],
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function main() {
  // Suppress console.log from skill factories during extraction
  const origLog = console.log
  const origInfo = console.info
  console.log = (...args: unknown[]) => process.stderr.write(args.join(' ') + '\n')
  console.info = (...args: unknown[]) => process.stderr.write(args.join(' ') + '\n')

  const results: ToolManifest[] = []

  for (const slug of SKILLS) {
    process.stderr.write(`Extracting ${slug}...`)
    const manifest = await extractManifest(slug)
    process.stderr.write(` ${manifest.tools.length} tools${manifest.error ? ` (ERROR: ${manifest.error})` : ''}\n`)
    results.push(manifest)
  }

  // Restore and output clean JSON to stdout
  console.log = origLog
  console.log(JSON.stringify(results, null, 2))

  const total = results.reduce((sum, r) => sum + r.tools.length, 0)
  const errors = results.filter((r) => r.error).length
  process.stderr.write(`\nDone: ${results.length} skills, ${total} tools, ${errors} errors\n`)

  // Force exit — some skills (e.g. veille) have background DB calls
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
