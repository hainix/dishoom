/**
 * For every film that has a tmdb_id, fetches cast + credits from TMDB.
 * Populates people and film_people tables with proper deduplication by name.
 * Also fills backdrop_src where missing.
 *
 * Usage:
 *   npx tsx scripts/enrich-films.ts
 *   npx tsx scripts/enrich-films.ts --limit 50
 */

import Database from "better-sqlite3";
import path from "path";

const API_KEY = process.env.TMDB_API_KEY || "f8a0148b386a3f00558c847eb9e4284f";
const PROFILE_BASE = "https://image.tmdb.org/t/p/w185";
const CONCURRENCY = 5;
const DELAY_MS = 250;

const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = OFF");

const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : null;

// Process films that have a tmdb_id stored (from previous enrichment run)
let films = db
  .prepare("SELECT id, title, year, tmdb_id as tmdbId, backdrop_src as backdropSrc FROM films WHERE tmdb_id IS NOT NULL ORDER BY id")
  .all() as { id: number; title: string; year: number | null; tmdbId: number; backdropSrc: string | null }[];

if (limit) films = films.slice(0, limit);
console.log(`Processing ${films.length} films with stored TMDB IDs...\n`);

// ── Prepared statements ───────────────────────────────────────────────────────

const updateBackdrop = db.prepare("UPDATE films SET backdrop_src = ? WHERE id = ?");

// Find person by name first (key fix: dedup by name not slug)
const findPersonByName = db.prepare("SELECT id, slug FROM people WHERE lower(name) = lower(?)");

const insertPerson = db.prepare(`
  INSERT INTO people (name, slug, image_url, type)
  VALUES (@name, @slug, @image_url, @type)
  ON CONFLICT(slug) DO UPDATE SET
    image_url = COALESCE(excluded.image_url, people.image_url)
`);

const insertFilmPerson = db.prepare(`
  INSERT OR IGNORE INTO film_people (film_id, person_id, role, character)
  VALUES (@film_id, @person_id, @role, @character)
`);

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

/** Get or create person; returns their DB id. Deduplicates by name. */
function getOrCreatePerson(name: string, imageUrl: string | null, type: string): number {
  // Check by name first
  const existing = findPersonByName.get(name) as { id: number; slug: string } | undefined;
  if (existing) {
    // Update image if we now have one
    if (imageUrl) {
      db.prepare("UPDATE people SET image_url = COALESCE(?, image_url) WHERE id = ?").run(imageUrl, existing.id);
    }
    return existing.id;
  }

  // New person — generate unique slug
  const base = slugify(name);
  let slug = base;
  let i = 2;
  while (db.prepare("SELECT id FROM people WHERE slug = ?").get(slug)) {
    slug = `${base}-${i++}`;
  }

  const info = insertPerson.run({ name, slug, image_url: imageUrl, type });
  return info.lastInsertRowid as number;
}

interface TMDBCastMember { name: string; character: string; order: number; profile_path: string | null; }
interface TMDBCrewMember { job: string; name: string; profile_path: string | null; }
interface TMDBDetail {
  backdrop_path: string | null;
  credits?: { cast: TMDBCastMember[]; crew: TMDBCrewMember[] };
}

async function fetchDetail(tmdbId: number): Promise<TMDBDetail | null> {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${API_KEY}&append_to_response=credits`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 429) { await sleep(2000); return fetchDetail(tmdbId); }
    return null;
  }
  return res.json();
}

function saveFilmData(filmId: number, backdropSrc: string | null, detail: TMDBDetail) {
  if (backdropSrc) updateBackdrop.run(backdropSrc, filmId);

  const cast = (detail.credits?.cast || []).filter(c => c.order < 10);
  const directors = (detail.credits?.crew || []).filter(c => c.job === "Director");

  const doSave = db.transaction(() => {
    for (const c of cast) {
      const imageUrl = c.profile_path ? `${PROFILE_BASE}${c.profile_path}` : null;
      const personId = getOrCreatePerson(c.name, imageUrl, "actor");
      insertFilmPerson.run({ film_id: filmId, person_id: personId, role: "actor", character: c.character || null });
    }
    for (const d of directors) {
      const imageUrl = d.profile_path ? `${PROFILE_BASE}${d.profile_path}` : null;
      const personId = getOrCreatePerson(d.name, imageUrl, "director");
      insertFilmPerson.run({ film_id: filmId, person_id: personId, role: "director", character: null });
    }
  });

  doSave();
}

// ── Main ──────────────────────────────────────────────────────────────────────

let done = 0;
let enriched = 0;
let failed = 0;

async function worker(queue: typeof films) {
  while (queue.length > 0) {
    const film = queue.shift()!;
    const detail = await fetchDetail(film.tmdbId);

    if (!detail) { failed++; done++; await sleep(DELAY_MS); continue; }

    const backdropUrl = detail.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${detail.backdrop_path}`
      : null;

    saveFilmData(film.id, film.backdropSrc ? null : backdropUrl, detail);
    enriched++;
    done++;

    if (done % 50 === 0 || done === films.length) {
      const pct = ((done / films.length) * 100).toFixed(1);
      process.stdout.write(`\r  ${done}/${films.length} (${pct}%) — enriched: ${enriched}, failed: ${failed}  `);
    }

    await sleep(DELAY_MS);
  }
}

async function main() {
  const queue = [...films];
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));

  console.log(`\n\nDone!`);
  const peopleCount = (db.prepare("SELECT COUNT(*) as n FROM people").get() as { n: number }).n;
  const castCount = (db.prepare("SELECT COUNT(*) as n FROM film_people").get() as { n: number }).n;
  const backdrops = (db.prepare("SELECT COUNT(*) as n FROM films WHERE backdrop_src IS NOT NULL").get() as { n: number }).n;
  console.log(`  Enriched:  ${enriched} films`);
  console.log(`  Unique people: ${peopleCount}`);
  console.log(`  Cast links:    ${castCount}`);
  console.log(`  Backdrops:     ${backdrops}`);

  db.close();
}

main().catch(console.error);
