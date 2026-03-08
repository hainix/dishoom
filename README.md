# Dishoom

Bollywood Rotten Tomatoes. Film ratings, reviews, cast profiles, songs, and news for 4,000+ Hindi films.

**Stack:** Next.js 16 (App Router) · Tailwind CSS v4 · SQLite (better-sqlite3) · Litestream → Cloudflare R2

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app reads from `prisma/dev.db` by default. No env vars needed locally.

---

## Deploying to Railway

### 1. Prerequisites

- [Railway](https://railway.app) account
- [Cloudflare](https://cloudflare.com) account (for R2 backups)
- TMDB API key (free at [themoviedb.org](https://www.themoviedb.org/settings/api))

---

### 2. Cloudflare R2 — create bucket + credentials

1. Cloudflare dashboard → **R2** → **Create bucket** (e.g. `dishoom-db`)
2. R2 overview page → **Manage R2 API Tokens** → **Create API Token**
   - Permissions: **Object Read & Write**
   - Scope: the bucket you just created
3. Save the three values shown after creation:
   - **Account ID** (visible in the R2 overview URL or top-right panel)
   - **Access Key ID**
   - **Secret Access Key**

---

### 3. Railway — create service

1. New project → **Deploy from GitHub repo** → select this repo
2. Railway will detect the `Dockerfile` and build automatically

---

### 4. Railway — add a persistent volume

1. Your service → **Volumes** tab → **Add Volume**
2. Mount path: `/data`

This is where the live SQLite database lives. It survives redeploys.

---

### 5. Railway — set environment variables

Go to your service → **Variables** and add:

| Variable | Value | Notes |
|---|---|---|
| `DB_PATH` | `/data/dishoom.db` | Where the live db lives on the volume |
| `R2_ACCOUNT_ID` | `<your cloudflare account id>` | From R2 overview page |
| `R2_BUCKET` | `<your bucket name>` | The bucket name you created in step 2 |
| `LITESTREAM_ACCESS_KEY_ID` | `<r2 access key id>` | From R2 API token creation |
| `LITESTREAM_SECRET_ACCESS_KEY` | `<r2 secret access key>` | From R2 API token creation |
| `TMDB_API_KEY` | `<your tmdb api key>` | Used by data import scripts |
| `YOUTUBE_API_KEY` | `<your youtube data api key>` | Used by song/video import scripts |
| `ANTHROPIC_API_KEY` | `<your anthropic api key>` | Used by AI article generation scripts |

Railway also needs `PORT` — it sets this automatically, no action needed.

---

### 6. Deploy

Push to `main` (or trigger a redeploy in Railway).

**What happens on first deploy:**
1. Litestream checks R2 for an existing backup — finds none
2. App seeds the database from the bundled `prisma/dev.db`
3. Litestream immediately starts replicating the db to R2 (every 10s)

**What happens on every subsequent deploy:**
1. Litestream restores the latest db snapshot from R2
2. The bundled `prisma/dev.db` is ignored — live data is always from R2

Code pushes never overwrite the production database.

---

### 7. Running data scripts against production

Use the Railway CLI to run import/update scripts against the live database:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link
railway login
railway link

# Run a script against the live db
railway run npx tsx scripts/update-current-films.ts
```

All changes are automatically replicated to R2 within 10 seconds.

---

## Database

SQLite at `prisma/dev.db` (local) or `/data/dishoom.db` (production).

**4,222 films · 7,706 people · 9,449 reviews · 16,043 songs · 9 articles**

Schema: `prisma/migrations/20260307074215_init/migration.sql`

### Import scripts (run from `dishoom-app/`)

```bash
npx tsx scripts/update-current-films.ts   # update statuses, add new releases
npx tsx scripts/enrich-films.ts            # fetch missing TMDB metadata
npx tsx scripts/fetch-posters.ts           # download poster/backdrop paths
npx tsx scripts/import-articles.ts         # import article content
```

---

## Environment variables — full reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_PATH` | Production only | `prisma/dev.db` (local) | Set to `/data/dishoom.db` in Railway |
| `R2_ACCOUNT_ID` | Production only | — | Cloudflare account ID |
| `R2_BUCKET` | Production only | — | R2 bucket name |
| `LITESTREAM_ACCESS_KEY_ID` | Production only | — | R2 S3-compatible access key |
| `LITESTREAM_SECRET_ACCESS_KEY` | Production only | — | R2 S3-compatible secret key |
| `TMDB_API_KEY` | Scripts only | — | TMDB v3 API key for data imports |
| `YOUTUBE_API_KEY` | Scripts only | — | YouTube Data API v3 key for video imports |
| `ANTHROPIC_API_KEY` | Scripts only | — | Anthropic API key for AI article generation |

Without `LITESTREAM_ACCESS_KEY_ID`, the app starts normally without replication (safe for local dev).
