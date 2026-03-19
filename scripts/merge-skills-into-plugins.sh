#!/bin/bash
set -euo pipefail

echo "=== Merging skills/ into plugins/docs/ ==="

for skill_dir in skills/lucid-*; do
  [ ! -d "$skill_dir" ] && continue
  name=$(basename "$skill_dir")
  plugin_dir="plugins/$name"

  if [ ! -d "$plugin_dir" ]; then
    echo "SKIP: $name (no matching plugin — handle separately)"
    continue
  fi

  echo "Merging $name..."

  # Move skill sub-directories to docs/references/
  if [ -d "$skill_dir/skills" ]; then
    mkdir -p "$plugin_dir/docs/references"
    for subskill in "$skill_dir/skills"/*/; do
      [ ! -d "$subskill" ] && continue
      subname=$(basename "$subskill")
      if [ ! -d "$plugin_dir/docs/references/$subname" ]; then
        cp -r "$subskill" "$plugin_dir/docs/references/$subname"
        echo "  docs/references/$subname"
      fi
    done
  fi

  # Move README if plugin doesn't have one
  if [ -f "$skill_dir/README.md" ] && [ ! -f "$plugin_dir/README.md" ]; then
    cp "$skill_dir/README.md" "$plugin_dir/README.md"
    echo "  README.md"
  fi

  # Move tests (merge into existing test dir, don't overwrite)
  if [ -d "$skill_dir/test" ]; then
    mkdir -p "$plugin_dir/test"
    cp -rn "$skill_dir/test/"* "$plugin_dir/test/" 2>/dev/null || true
    echo "  test/"
  fi

  # Move migrations
  if [ -d "$skill_dir/migrations" ]; then
    mkdir -p "$plugin_dir/migrations"
    cp -rn "$skill_dir/migrations/"* "$plugin_dir/migrations/" 2>/dev/null || true
    echo "  migrations/"
  fi

  # Move supabase migrations
  if [ -d "$skill_dir/supabase" ]; then
    mkdir -p "$plugin_dir/supabase"
    cp -rn "$skill_dir/supabase/"* "$plugin_dir/supabase/" 2>/dev/null || true
    echo "  supabase/"
  fi
done

echo ""
echo "Done. Review plugins/*/docs/ then run Task 3."
