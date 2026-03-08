#!/bin/bash
# Daily cron — runs the full pipeline: articles, films status, songs (embed audit + backfill).
# Scheduled via crontab: 0 2 * * *
# Logs to: scripts/run-daily.log

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="$DIR/scripts/run-daily.log"
NPX="$DIR/node_modules/.bin/tsx"

echo "──────────────────────────────────────────" >> "$LOG"
echo "$(date '+%Y-%m-%d %H:%M:%S') — Daily cron starting" >> "$LOG"

"$NPX" "$DIR/scripts/run-daily.ts" >> "$LOG" 2>&1
STATUS=$?

if [ $STATUS -eq 0 ]; then
  echo "$(date '+%H:%M:%S') — Done (exit 0)" >> "$LOG"
else
  echo "$(date '+%H:%M:%S') — FAILED (exit $STATUS)" >> "$LOG"
fi
