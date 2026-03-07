#!/bin/bash
# Railway startup script.
# On first deploy: seeds the persistent volume with the bundled database.
# On subsequent deploys: skips copy (volume already has live data).

DATA_PATH="${DB_PATH:-/data/dev.db}"
DATA_DIR="$(dirname "$DATA_PATH")"

if [ ! -f "$DATA_PATH" ]; then
  echo "First deploy — seeding database to $DATA_PATH"
  mkdir -p "$DATA_DIR"
  cp /app/prisma/dev.db "$DATA_PATH"
  echo "Database seeded ($(du -sh "$DATA_PATH" | cut -f1))"
else
  echo "Database already exists at $DATA_PATH — skipping seed"
fi

exec node_modules/.bin/next start
