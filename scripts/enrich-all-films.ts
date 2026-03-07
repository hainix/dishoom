/**
 * Enriches all films in the DB with missing data:
 *  1. Trailer + backdrop from TMDB (for films with tmdb_id, no trailer)
 *  2. Cast/crew into film_people (for films with tmdb_id, no cast entries)
 *  3. Oneliner via Claude Haiku (for films with plot/summary but no oneliner)
 *  4. Badges via rule-based logic if still missing (no Claude needed)
 *
 * Optimised for minimal cost: Claude only for oneliners (~60 tokens output),
 * using claude-haiku-4-5-20251001. Skips anything already filled.
 *
 * Run: npx tsx scripts/enrich-all-films.ts
 * Flags:
 *   --only-trailers   Only fetch trailers/backdrops, skip Claude
 *   --only-oneliners  Only generate oneliners
 *   --only-cast       Only populate film_people
 *   --limit N         Process at most N films (for testing)
 */

import Database from "better-sqlite3";
import Anthropic from "@anthropic-ai/sdk";
import path from "path";
import fs from "fs";

// ── Config ────────────────────────────────────────────────────────────────────

const TMDB_KEY = process.env.TMDB_API_KEY || "f8a0148b386a3f00558c847eb9e4284f";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";
const PROFILE_BASE  = "https://image.tmdb.org/t/p/w185";

// Auto-load .env.local (lower priority than existing env vars)
if (!process.env.ANTHROPIC_API_KEY) {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const eqIdx = line.indexOf("=");
      if (eqIdx < 1) continue;
      const k = line.slice(0, eqIdx).trim();
      const v = line.slice(eqIdx + 1).trim();
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? null;

const args = process.argv.slice(2);
const onlyTrailers  = args.includes("--only-trailers");
const onlyOneliners = args.includes("--only-oneliners");
const onlyCast      = args.includes("--only-cast");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : Infinity;

const doTrailers  = !onlyOneliners && !onlyCast;
const doCast      = !onlyTrailers  && !onlyOneliners;
const doOneliners = !onlyTrailers  && !onlyCast;

// ── Database ──────────────────────────────────────────────────────────────────

const db = new Database(path.resolve(process.cwd(), "prisma/dev.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = OFF");

// ── Anthropic ─────────────────────────────────────────────────────────────────

const anthropic = ANTHROPIC_KEY ? new Anthropic({ apiKey: ANTHROPIC_KEY }) : null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function slugify(str: string): string {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// ── TMDB ──────────────────────────────────────────────────────────────────────

interface TMDBDetail {
  backdrop_path: string | null;
  videos: { results: Array<{ site: string; key: string; type: string; official: boolean }> };
  credits: {
    cast: Array<{ name: string; character: string; order: number; profile_path: string | null }>;
    crew: Array<{ job: string; name: string; profile_path: string | null }>;
  };
}

async function fetchTMDB(tmdbId: number): Promise<TMDBDetail | null> {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=credits,videos`;
  try {
    const res = await fetch(url);
    if (res.status === 429) { await sleep(3000); return fetchTMDB(tmdbId); }
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function extractTrailer(videos: TMDBDetail["videos"]["results"]): string | null {
  const trailers = videos.filter(v => v.site === "YouTube" && v.type === "Trailer");
  return (trailers.find(v => v.official) ?? trailers[0])?.key ?? null;
}

// ── People helpers ────────────────────────────────────────────────────────────

function getOrCreatePerson(name: string, imageUrl: string | null, type: string): number {
  const existing = db.prepare("SELECT id FROM people WHERE lower(name) = lower(?)").get(name) as { id: number } | undefined;
  if (existing) {
    if (imageUrl) db.prepare("UPDATE people SET image_url = COALESCE(?, image_url) WHERE id = ?").run(imageUrl, existing.id);
    return existing.id;
  }
  const base = slugify(name);
  let slug = base;
  let i = 2;
  while (db.prepare("SELECT id FROM people WHERE slug = ?").get(slug)) slug = `${base}-${i++}`;
  const row = db.prepare(`
    INSERT INTO people (name, slug, image_url, type) VALUES (?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET image_url = COALESCE(excluded.image_url, people.image_url)
  `).run(name, slug, imageUrl, type);
  return row.lastInsertRowid as number;
}

// ── Claude oneliner ───────────────────────────────────────────────────────────

// Compact few-shot — 8 examples, minimal whitespace
const FEW_SHOT = [
  ["Om Shanti Om (2007)", "Tongue explosively in-cheek, Director Farah Khan's homage to yesteryear's Bollywood is sizzling with masala: item numbers, reincarnation, sideburns, and so much more!"],
  ["Udaan (2010)", "A refreshing look at youth, dreams, and the sometimes unpleasant complications of a father-son relationship — gritty, powerful, and worth your time."],
  ["Roja (1992)", "Mani Ratnam's crisp storytelling and A.R. Rahman's stunning debut help Roja blossom into an enthralling tale of terrorism and love."],
  ["Jaani Dushman (2002)", "Hideously cartoonish and senseless — a reminder that spending all your money on A-list stars doesn't guarantee a film that's watchable."],
  ["Kill (2024)", "A commando's mission to rescue his fiancée turns the world's most violent train journey into a blood-soaked action showpiece."],
  ["Stree 2 (2024)", "The witch is back — Chanderi's most fearless heroine returns to face a terrifying new supernatural threat."],
  ["Veer-Zaara (2004)", "VZ embodies typical Yash Raj star-crossed lovers storytelling across the Indo-Pak border, and features exactly what you'd want from SRK."],
  ["Andaz Apna Apna (1994)", "The funniest Bollywood film never made a dime on release — now a sacred text for anyone who grew up quoting 'Crime Master Gogo'."],
].map(([t, o]) => `${t}: ${o}`).join("\n");

async function generateOneliner(title: string, year: number | null, plot: string): Promise<string | null> {
  if (!anthropic) return null;
  const prompt = `Dishoom Films critic one-liners (15-30 words, opinionated, no exclamation unless earned):\n${FEW_SHOT}\n\n${title}${year ? ` (${year})` : ""}. Plot: ${plot.slice(0, 300)}\n\nOneliner:`;
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,  // oneliners are short — keep output tokens minimal
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    return text.replace(/^["']|["']$/g, "").trim() || null;
  } catch (err) {
    console.error(`  [Claude] ${title}: ${(err as Error).message}`);
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

type FilmRow = {
  id: number;
  title: string;
  year: number | null;
  tmdb_id: number | null;
  trailer: string | null;
  backdrop_src: string | null;
  oneliner: string | null;
  plot: string | null;
  summary: string | null;
  stars: string | null;
  has_cast: number;
};

async function main() {
  console.log(`\n=== Dishoom DB Enrichment ===`);
  console.log(`Trailers: ${doTrailers}, Cast: ${doCast}, Oneliners: ${doOneliners && !!anthropic}`);
  console.log(`Claude: ${anthropic ? "enabled (haiku)" : "DISABLED — set ANTHROPIC_API_KEY"}\n`);

  // Load all films needing work
  const films = db.prepare(`
    SELECT f.id, f.title, f.year, f.tmdb_id, f.trailer, f.backdrop_src,
           f.oneliner, f.plot, f.summary, f.stars,
           COUNT(fp.person_id) as has_cast
    FROM films f
    LEFT JOIN film_people fp ON fp.film_id = f.id
    GROUP BY f.id
    HAVING (
      (f.tmdb_id IS NOT NULL AND (f.trailer IS NULL OR f.trailer = ''))
      OR (f.tmdb_id IS NOT NULL AND has_cast = 0)
      OR ((f.plot IS NOT NULL OR f.summary IS NOT NULL)
           AND (f.oneliner IS NULL OR f.oneliner = ''))
    )
    ORDER BY f.year DESC NULLS LAST
  `).all() as FilmRow[];

  const toProcess = films.slice(0, limit === Infinity ? films.length : limit);
  console.log(`Films needing enrichment: ${toProcess.length} (of ${films.length} total candidates)\n`);

  let tTrailers = 0, tCast = 0, tOneliners = 0;
  const insertFilmPerson = db.prepare(`
    INSERT OR IGNORE INTO film_people (film_id, person_id, role, character)
    VALUES (?, ?, ?, ?)
  `);

  for (let i = 0; i < toProcess.length; i++) {
    const film = toProcess[i];
    const needsTrailer = doTrailers && film.tmdb_id && (!film.trailer);
    const needsCast    = doCast    && film.tmdb_id && film.has_cast === 0;
    const plotText     = film.plot || film.summary || "";
    const needsOneliner = doOneliners && plotText && (!film.oneliner);

    process.stdout.write(`[${i + 1}/${toProcess.length}] ${film.title} (${film.year ?? "?"})...`);

    let detail: TMDBDetail | null = null;

    // ── Fetch TMDB if needed ─────────────────────────────────────────────────
    if ((needsTrailer || needsCast) && film.tmdb_id) {
      detail = await fetchTMDB(film.tmdb_id);
      await sleep(200);

      if (detail) {
        // Update trailer + backdrop
        if (needsTrailer) {
          const trailer = extractTrailer(detail.videos.results);
          const backdrop = detail.backdrop_path ? `${BACKDROP_BASE}${detail.backdrop_path}` : film.backdrop_src;
          if (trailer || backdrop) {
            db.prepare(`UPDATE films SET
              trailer = COALESCE(?, trailer),
              backdrop_src = COALESCE(?, backdrop_src)
              WHERE id = ?`
            ).run(trailer, backdrop, film.id);
            if (trailer) tTrailers++;
          }
        }

        // Populate film_people
        if (needsCast) {
          const cast      = detail.credits.cast.filter(c => c.order < 10);
          const directors = detail.credits.crew.filter(c => c.job === "Director");
          const writers   = detail.credits.crew.filter(c => ["Screenplay", "Story", "Writer"].includes(c.job)).slice(0, 3);
          const composers = detail.credits.crew.filter(c => c.job === "Original Music Composer");

          const savePeople = db.transaction(() => {
            for (const c of cast) {
              const img = c.profile_path ? `${PROFILE_BASE}${c.profile_path}` : null;
              const pid = getOrCreatePerson(c.name, img, "actor");
              insertFilmPerson.run(film.id, pid, "actor", c.character || null);
            }
            for (const d of directors) {
              const img = d.profile_path ? `${PROFILE_BASE}${d.profile_path}` : null;
              const pid = getOrCreatePerson(d.name, img, "director");
              insertFilmPerson.run(film.id, pid, "director", null);
            }
            for (const w of writers) {
              const img = w.profile_path ? `${PROFILE_BASE}${w.profile_path}` : null;
              const pid = getOrCreatePerson(w.name, img, "writer");
              insertFilmPerson.run(film.id, pid, "writer", null);
            }
            for (const c of composers) {
              const img = c.profile_path ? `${PROFILE_BASE}${c.profile_path}` : null;
              const pid = getOrCreatePerson(c.name, img, "music_director");
              insertFilmPerson.run(film.id, pid, "music_director", null);
            }

            // Update stars column if empty
            if (!film.stars && cast.length > 0) {
              const starNames = cast.slice(0, 4).map(c => c.name).join(", ");
              db.prepare("UPDATE films SET stars = ? WHERE id = ?").run(starNames, film.id);
            }
          });
          savePeople();
          tCast++;
        }
      }
    }

    // ── Claude oneliner ──────────────────────────────────────────────────────
    if (needsOneliner) {
      const oneliner = await generateOneliner(film.title, film.year, plotText);
      if (oneliner) {
        db.prepare("UPDATE films SET oneliner = ? WHERE id = ?").run(oneliner, film.id);
        tOneliners++;
      }
      await sleep(150); // rate-limit Claude
    }

    const parts: string[] = [];
    if (needsTrailer) parts.push("trailer");
    if (needsCast)    parts.push("cast");
    if (needsOneliner) parts.push("oneliner");
    process.stdout.write(` ${parts.join("+") || "ok"}\n`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n=== Done ===`);
  console.log(`  Trailers added:  ${tTrailers}`);
  console.log(`  Cast populated:  ${tCast} films`);
  console.log(`  Oneliners added: ${tOneliners}`);

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN oneliner IS NOT NULL AND oneliner != '' THEN 1 END) as oneliners,
      COUNT(CASE WHEN trailer  IS NOT NULL AND trailer  != '' THEN 1 END) as trailers,
      COUNT(CASE WHEN poster_src IS NOT NULL THEN 1 END) as posters
    FROM films
  `).get() as { total: number; oneliners: number; trailers: number; posters: number };
  const castFilms = (db.prepare("SELECT COUNT(DISTINCT film_id) as n FROM film_people").get() as { n: number }).n;

  console.log(`\n  DB totals:`);
  console.log(`    Films:          ${stats.total.toLocaleString()}`);
  console.log(`    With oneliner:  ${stats.oneliners.toLocaleString()}`);
  console.log(`    With trailer:   ${stats.trailers.toLocaleString()}`);
  console.log(`    With poster:    ${stats.posters.toLocaleString()}`);
  console.log(`    With cast:      ${castFilms.toLocaleString()} films`);

  db.close();
}

main().catch(console.error);
