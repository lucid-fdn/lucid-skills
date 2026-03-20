#!/bin/bash
set -euo pipefail
ERRORS=0
WARNS=0

echo "=== Validating feature structure ==="

for feature_dir in lucid-*/; do
  name=$(basename "$feature_dir")

  # Check skill/SKILL.md exists
  if [ ! -f "$feature_dir/skill/SKILL.md" ]; then
    echo "WARN:  $name missing skill/SKILL.md"
    WARNS=$((WARNS + 1))
  fi

  # Check plugin exists (optional for docs-only features)
  if [ -d "$feature_dir/plugin" ]; then
    if [ ! -f "$feature_dir/plugin/package.json" ]; then
      echo "ERROR: $name/plugin missing package.json"
      ERRORS=$((ERRORS + 1))
    fi
    if [ ! -f "$feature_dir/plugin/plugin.json" ]; then
      echo "WARN:  $name/plugin missing plugin.json"
      WARNS=$((WARNS + 1))
    fi
  fi
done

echo ""
echo "Results: $ERRORS errors, $WARNS warnings"
if [ $ERRORS -gt 0 ]; then
  echo "FAILED"
  exit 1
else
  echo "PASSED"
fi
