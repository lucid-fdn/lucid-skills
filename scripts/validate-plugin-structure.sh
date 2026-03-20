#!/bin/bash
set -euo pipefail
ERRORS=0
WARNS=0

echo "=== Validating plugin structure ==="

for plugin_dir in plugins/lucid-*; do
  name=$(basename "$plugin_dir")

  # Check package.json exists
  if [ ! -f "$plugin_dir/package.json" ]; then
    echo "ERROR: $name missing package.json"
    ERRORS=$((ERRORS + 1))
  fi

  # Check matching skill exists in skills/
  if [ ! -f "skills/$name/SKILL.md" ]; then
    echo "WARN:  $name missing skills/$name/SKILL.md"
    WARNS=$((WARNS + 1))
  fi

  # Check no orphaned OpenClaw files
  for f in skill.yaml openclaw.plugin.json; do
    if [ -f "$plugin_dir/$f" ]; then
      echo "WARN:  $name still has $f"
      WARNS=$((WARNS + 1))
    fi
  done

  # Check plugin.json exists
  if [ ! -f "$plugin_dir/plugin.json" ]; then
    echo "WARN:  $name missing plugin.json"
    WARNS=$((WARNS + 1))
  fi
done

# Check no orphaned skills/ entries without plugin
if [ -d "skills" ]; then
  for skill_dir in skills/lucid-*; do
    [ ! -d "$skill_dir" ] && continue
    name=$(basename "$skill_dir")
    if [ ! -d "plugins/$name" ]; then
      echo "WARN:  skills/$name has no matching plugin"
      WARNS=$((WARNS + 1))
    fi
  done
fi

echo ""
echo "Results: $ERRORS errors, $WARNS warnings"
if [ $ERRORS -gt 0 ]; then
  echo "FAILED"
  exit 1
else
  echo "PASSED"
fi
