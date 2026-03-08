#!/bin/bash
# Railway startup script.
# Priority: R2 backup (Litestream) > bundled seed db > nothing
#
# - If Litestream env vars are set AND a backup exists in R2 → restore from R2
# - If no R2 backup yet (first ever deploy) → seed from bundled prisma/dev.db
# - On all subsequent deploys → Litestream restores latest data from R2

DATA_PATH="${DB_PATH:-/data/dev.db}"
DATA_DIR="$(dirname "$DATA_PATH")"
mkdir -p "$DATA_DIR"

if [ -n "$LITESTREAM_ACCESS_KEY_ID" ]; then
  echo "Litestream configured — attempting restore from R2..."
  litestream restore -if-db-not-exists -if-replica-exists -config /app/litestream.yml "$DATA_PATH"
  echo "Restore step complete (skipped if replica not found or db already exists)"
fi

# Seed from bundled db if still no db (true first deploy, no R2 backup yet)
if [ ! -f "$DATA_PATH" ]; then
  echo "No database found — seeding from bundled prisma/dev.db"
  cp /app/prisma/dev.db "$DATA_PATH"
  echo "Database seeded ($(du -sh "$DATA_PATH" | cut -f1))"
else
  echo "Database ready at $DATA_PATH ($(du -sh "$DATA_PATH" | cut -f1))"
fi

# Start Next.js — wrapped in Litestream if configured (continuous replication to R2)
if [ -n "$LITESTREAM_ACCESS_KEY_ID" ]; then
  echo "Starting with Litestream replication to R2..."
  exec litestream replicate -config /app/litestream.yml -exec "node_modules/.bin/next start"
else
  echo "Starting without Litestream (LITESTREAM_ACCESS_KEY_ID not set)"
  exec node_modules/.bin/next start
fi
