#!/usr/bin/env bash
# validate-all.sh — Lint all AgentSkills plugins in the monorepo
# Checks: required files exist, package.json is valid JSON, skill.yaml or src/ present

set -euo pipefail
SKILLS_DIR="$(cd "$(dirname "$0")/../skills" && pwd)"
ERRORS=0

for skill_dir in "$SKILLS_DIR"/*/; do
  name=$(basename "$skill_dir")

  # Must have package.json
  if [ ! -f "$skill_dir/package.json" ]; then
    echo "ERROR: $name — missing package.json"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # package.json must be valid JSON
  if ! python3 -c "import json; json.load(open('$skill_dir/package.json'))" 2>/dev/null && \
     ! node -e "JSON.parse(require('fs').readFileSync('$skill_dir/package.json','utf8'))" 2>/dev/null; then
    echo "ERROR: $name — invalid package.json"
    ERRORS=$((ERRORS + 1))
  fi

  # Must have either skill.yaml (pure AgentSkills) or src/ (TypeScript skills)
  if [ ! -f "$skill_dir/skill.yaml" ] && [ ! -d "$skill_dir/src" ]; then
    echo "WARN:  $name — no skill.yaml or src/ directory"
  fi

  # Must have skills/ directory (contains actual skill definitions)
  if [ ! -d "$skill_dir/skills" ]; then
    echo "WARN:  $name — no skills/ directory"
  fi

  # Check openclaw.plugin.json if present
  if [ -f "$skill_dir/openclaw.plugin.json" ]; then
    if ! node -e "JSON.parse(require('fs').readFileSync('$skill_dir/openclaw.plugin.json','utf8'))" 2>/dev/null; then
      echo "ERROR: $name — invalid openclaw.plugin.json"
      ERRORS=$((ERRORS + 1))
    fi
  fi

  echo "  OK:  $name"
done

echo ""
echo "Validated $(ls -d "$SKILLS_DIR"/*/ | wc -l) skills, $ERRORS errors"

if [ "$ERRORS" -gt 0 ]; then
  exit 1
fi
