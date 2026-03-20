#!/usr/bin/env node
/**
 * CI script: import a single skill into Supabase skill_catalog.
 * Usage: node scripts/ci-import-skill.mjs <feature-dir>
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { createHash } from 'crypto'

const featureDir = process.argv[2]
if (!featureDir) {
  console.error('Usage: ci-import-skill.mjs <feature-dir>')
  process.exit(1)
}

const skillDir = featureDir + '/skill'
const skillFile = skillDir + '/SKILL.md'

if (!existsSync(skillFile)) {
  console.error('SKIP: no SKILL.md at', skillFile)
  process.exit(0)
}

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Read SKILL.md
let raw = readFileSync(skillFile, 'utf-8')

// Parse frontmatter
const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
let frontmatter = {}
let body = raw
if (fmMatch) {
  try {
    // Simple YAML parse (key: value lines)
    const lines = fmMatch[1].split('\n')
    for (const line of lines) {
      const m = line.match(/^(\w+):\s*(.+)$/)
      if (m) frontmatter[m[1]] = m[2].trim()
    }
  } catch {}
  body = fmMatch[2]
}

// Inline references
const refsDir = skillDir + '/references'
if (existsSync(refsDir)) {
  const dirs = readdirSync(refsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
  for (const dir of dirs) {
    const refSkill = refsDir + '/' + dir.name + '/SKILL.md'
    if (existsSync(refSkill)) {
      const content = readFileSync(refSkill, 'utf-8')
      const refMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/)
      raw += '\n\n' + (refMatch ? refMatch[1] : content)
    }
    // Also inline other .md files in the reference dir
    const mdFiles = readdirSync(refsDir + '/' + dir.name)
      .filter(f => f.endsWith('.md') && f !== 'SKILL.md')
      .sort()
    for (const f of mdFiles) {
      raw += '\n\n' + readFileSync(refsDir + '/' + dir.name + '/' + f, 'utf-8')
    }
  }
}

const slug = frontmatter.name || featureDir.split('/').pop()
const description = frontmatter.description || ''
const hash = createHash('sha256').update(raw).digest('hex')

const supabase = createClient(supabaseUrl, supabaseKey)

const { error } = await supabase.from('skill_catalog').upsert({
  slug,
  name: slug,
  description,
  raw_content: raw,
  sanitized_content: body,
  frontmatter,
  source: 'manual',
  source_path: featureDir + '/skill/SKILL.md',
  content_hash: hash,
  status: 'approved',
  content_chars: body.length,
  updated_at: new Date().toISOString(),
}, { onConflict: 'slug' })

if (error) {
  console.error('FAILED:', slug, error.message)
  process.exit(1)
}

console.log('OK:', slug, '(' + body.length + ' chars)')
