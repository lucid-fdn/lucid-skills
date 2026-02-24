---
name: Lucid Compete
description: Competitive intelligence monitoring and analysis
version: 1.0.0
tools:
  - compete_add_competitor
  - compete_list_competitors
  - compete_update_competitor
  - compete_remove_competitor
  - compete_add_monitor
  - compete_list_monitors
  - compete_remove_monitor
  - compete_fetch_now
  - compete_list_signals
  - compete_generate_battlecard
  - compete_generate_brief
  - compete_search
  - compete_status
---

# Lucid Compete

Monitor competitors across 12 data source types, detect signals, and generate AI-powered battle cards and intel briefs.

## Quick Start

1. Add a competitor: `compete_add_competitor` with name and website
2. Auto-discovered monitors will start tracking changes
3. Fetch latest data: `compete_fetch_now`
4. Generate a battle card: `compete_generate_battlecard`
5. Get a weekly brief: `compete_generate_brief`

## Common Workflows

### Track a new competitor
"Add [company] as a competitor and start monitoring their pricing page, GitHub repos, and job postings."

### Get competitive intelligence
"Generate a battle card for [competitor]" or "Create a weekly competitive intel brief"

### Search for specific signals
"Search for any pricing changes in the last 30 days" or "Show me all critical signals"
