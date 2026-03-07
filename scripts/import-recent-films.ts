/**
 * Imports recent Bollywood films (2012–2025) from TMDB.
 * Uses /discover/movie filtered to Hindi-language films, sorted by popularity.
 * Fetches up to 20 pages (~400 films), inserting only those not already in the DB.
 *
 * Usage:
 *   npx tsx scripts/import-recent-films.ts
 *   npx tsx scripts/import-recent-films.ts --pages 5  # test with fewer pages
 */

import Database from "better-sqlite3";
import path from "path";

const API_KEY = process.env.TMDB_API_KEY || "f8a0148b386a3f00558c847eb9e4284f";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const DELAY_MS = 300;

const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = OFF");

const args = process.argv.slice(2);
const pagesIdx = args.indexOf("--pages");
const maxPages = pagesIdx !== -1 ? parseInt(args[pagesIdx + 1]) : 20;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
}

interface TMDBMovieDetail {
  id: number;
  imdb_id: string | null;
  credits?: {
    crew: Array<{ job: string; name: string }>;
    cast: Array<{ name: string; order: number }>;
  };
}

function slugify(title: string, year: number | null): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
  return year ? `${base}-${year}` : base;
}

function makeUniqueSlug(slug: string): string {
  const existing = db.prepare("SELECT id FROM films WHERE slug = ?").get(slug);
  if (!existing) return slug;
  // Append a suffix
  let i = 2;
  while (db.prepare("SELECT id FROM films WHERE slug = ?").get(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}

async function fetchPage(page: number): Promise<{ results: TMDBMovie[]; total_pages: number }> {
  const params = new URLSearchParams({
    api_key: API_KEY,
    with_original_language: "hi",
    sort_by: "popularity.desc",
    "primary_release_date.gte": "2012-01-01",
    "primary_release_date.lte": "2025-12-31",
    "vote_count.gte": "50",   // filter out very obscure films
    page: String(page),
  });

  const url = `https://api.themoviedb.org/3/discover/movie?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 429) { await sleep(2000); return fetchPage(page); }
    throw new Error(`TMDB error ${res.status} on page ${page}`);
  }
  return res.json();
}

async function fetchDetails(tmdbId: number): Promise<TMDBMovieDetail> {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${API_KEY}&append_to_response=credits`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 429) { await sleep(2000); return fetchDetails(tmdbId); }
    return { id: tmdbId, imdb_id: null };
  }
  return res.json();
}

const insertFilm = db.prepare(`
  INSERT OR IGNORE INTO films
    (title, year, rating, votes, poster_src, summary, slug, status)
  VALUES
    (@title, @year, @rating, @votes, @poster_src, @summary, @slug, @status)
`);

async function main() {
  let page = 1;
  let totalPages = 1;
  let inserted = 0;
  let skipped = 0;

  console.log(`Importing recent Bollywood films from TMDB (up to ${maxPages} pages)...\n`);

  while (page <= Math.min(totalPages, maxPages)) {
    process.stdout.write(`  Page ${page}/${Math.min(totalPages, maxPages)}...`);
    const data = await fetchPage(page);
    totalPages = data.total_pages;

    for (const movie of data.results) {
      const year = movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : null;
      const titleLower = movie.title.toLowerCase();

      // Check if already exists (by title + year)
      const existing = db.prepare(
        "SELECT id FROM films WHERE lower(title) = ? AND year = ?"
      ).get(titleLower, year);

      if (existing) {
        skipped++;
        continue;
      }

      const rating = movie.vote_average > 0
        ? Math.round(movie.vote_average * 10) // convert 0-10 to 0-100
        : null;

      const slug = makeUniqueSlug(slugify(movie.title, year));
      const posterUrl = movie.poster_path ? `${IMAGE_BASE}${movie.poster_path}` : null;

      insertFilm.run({
        title: movie.title,
        year,
        rating,
        votes: movie.vote_count || 0,
        poster_src: posterUrl,
        summary: movie.overview || null,
        slug,
        status: null,
      });
      inserted++;
    }

    console.log(` inserted: ${inserted}, skipped: ${skipped}`);
    page++;
    await sleep(DELAY_MS);
  }

  console.log(`\nDone!`);
  console.log(`  Inserted: ${inserted} new films`);
  console.log(`  Skipped:  ${skipped} already in DB`);

  const total = (db.prepare("SELECT COUNT(*) as n FROM films").get() as { n: number }).n;
  console.log(`  Total films in DB: ${total}`);

  db.close();
}

main().catch(console.error);
