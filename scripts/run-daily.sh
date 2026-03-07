#!/bin/bash
# Daily cron script — fetches YouTube IDs for trailers + songs.
# Budget: 10,000 units/day free = 100 searches total.
# Split: 60 trailers (popular films first) + 40 songs (top-rated films first).
# Logs to: scripts/run-daily.log

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="$DIR/scripts/run-daily.log"
NPX="$DIR/node_modules/.bin/tsx"

echo "──────────────────────────────────────────" >> "$LOG"
echo "$(date '+%Y-%m-%d %H:%M:%S') — Daily fetch starting" >> "$LOG"

# Trailers first (60 searches — popular films need this most)
echo "$(date '+%H:%M:%S') Fetching trailers (60)…" >> "$LOG"
"$NPX" "$DIR/scripts/fetch-trailers.ts" --limit=60 >> "$LOG" 2>&1

# Songs second (40 searches — fills Watch page over time)
echo "$(date '+%H:%M:%S') Fetching song IDs (40)…" >> "$LOG"
"$NPX" "$DIR/scripts/fetch-youtube-ids.ts" --limit=40 >> "$LOG" 2>&1

echo "$(date '+%H:%M:%S') — Done." >> "$LOG"
