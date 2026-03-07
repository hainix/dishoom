/**
 * Fetches TMDB poster URLs for all films that don't have one yet.
 * Uses /search/movie with title + year for best match accuracy.
 * Runs 4 concurrent workers to stay under TMDB rate limits (~40 req/10s).
 *
 * Usage:
 *   npx tsx scripts/fetch-posters.ts
 *   npx tsx scripts/fetch-posters.ts --limit 100   # test with first 100
 */

import Database from "better-sqlite3";
import path from "path";

const API_KEY = process.env.TMDB_API_KEY || "f8a0148b386a3f00558c847eb9e4284f";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const CONCURRENCY = 4;
const DELAY_MS = 300; // ~3 req/s per worker = 12 req/s total (well under 40/10s limit)

const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : null;

// Only fetch films without a poster
let films = db.prepare(
  "SELECT id, title, year FROM films WHERE poster_src IS NULL ORDER BY id"
).all() as { id: number; title: string; year: number | null }[];

if (limit) films = films.slice(0, limit);

console.log(`Fetching posters for ${films.length} films (${CONCURRENCY} workers)...\n`);

const updatePoster = db.prepare(
  "UPDATE films SET poster_src = ? WHERE id = ?"
);

let done = 0;
let found = 0;
let notFound = 0;

async function searchTMDB(title: string, year: number | null): Promise<string | null> {
  const params = new URLSearchParams({
    api_key: API_KEY,
    query: title,
    language: "en-US",
    page: "1",
  });
  if (year) params.set("primary_release_year", String(year));

  const url = `https://api.themoviedb.org/3/search/movie?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    if (res.status === 429) {
      // Rate limited — wait and retry
      await sleep(2000);
      return searchTMDB(title, year);
    }
    return null;
  }

  const data = await res.json() as { results: Array<{ poster_path: string | null }> };
  const first = data.results?.[0];
  if (first?.poster_path) {
    return `${IMAGE_BASE}${first.poster_path}`;
  }

  // Try without year if no result
  if (year) return searchTMDB(title, null);
  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function worker(queue: typeof films) {
  while (queue.length > 0) {
    const film = queue.shift()!;
    const posterUrl = await searchTMDB(film.title, film.year);

    if (posterUrl) {
      updatePoster.run(posterUrl, film.id);
      found++;
    } else {
      notFound++;
    }

    done++;
    if (done % 50 === 0 || done === films.length) {
      const pct = ((done / films.length) * 100).toFixed(1);
      process.stdout.write(`\r  ${done}/${films.length} (${pct}%) — found: ${found}, not found: ${notFound}  `);
    }

    await sleep(DELAY_MS);
  }
}

async function main() {
  const queue = [...films]; // shared queue (JS is single-threaded, safe)
  const workers = Array.from({ length: CONCURRENCY }, () => worker(queue));
  await Promise.all(workers);

  console.log(`\n\nDone!`);
  console.log(`  Found posters:    ${found}`);
  console.log(`  Not found:        ${notFound}`);
  console.log(`  Total processed:  ${done}`);

  db.close();
}

main().catch(console.error);
