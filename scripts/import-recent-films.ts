/**
 * Imports recent Bollywood films (2012–2025) from TMDB with complete profiles.
 *
 * For each new film, in a single pass:
 *   1. TMDB details (credits + videos) — cast, crew, trailer YouTube ID, backdrop
 *   2. Claude — one-liner, vibe badges, known song titles + tags
 *   3. YouTube API — video IDs for each Claude-identified song
 *
 * Populates: films, film_people (cast/crew), songs
 *
 * Keys (set in .env.local or environment):
 *   ANTHROPIC_API_KEY — required for one-liners, badges, songs
 *   YOUTUBE_API_KEY   — optional; unfound songs filled later by fetch-youtube-ids.ts
 *
 * Usage:
 *   npx tsx scripts/import-recent-films.ts
 *   npx tsx scripts/import-recent-films.ts --pages 5
 */

import Database from "better-sqlite3";
import Anthropic from "@anthropic-ai/sdk";
import path from "path";
import fs from "fs";

// ── Config ────────────────────────────────────────────────────────────────────

const TMDB_KEY = process.env.TMDB_API_KEY || "f8a0148b386a3f00558c847eb9e4284f";
const IMAGE_BASE    = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";
const PROFILE_BASE  = "https://image.tmdb.org/t/p/w185";

// Load .env.local for optional keys without overwriting env vars already set
if (!process.env.ANTHROPIC_API_KEY || !process.env.YOUTUBE_API_KEY) {
  const envPath = path.resolve(__dirname, "../.env.local");
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
const YOUTUBE_KEY   = process.env.YOUTUBE_API_KEY   ?? null;

const args = process.argv.slice(2);
const pagesIdx = args.indexOf("--pages");
const maxPages = pagesIdx !== -1 ? parseInt(args[pagesIdx + 1]) : 20;

// ── Database ──────────────────────────────────────────────────────────────────

const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = OFF");

// ── Clients ───────────────────────────────────────────────────────────────────

const anthropic = ANTHROPIC_KEY ? new Anthropic({ apiKey: ANTHROPIC_KEY }) : null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function slugify(str: string, year: number | null = null): string {
  const base = str.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
  return year ? `${base}-${year}` : base;
}

function makeUniqueSlug(slug: string): string {
  const taken = (s: string) => !!db.prepare("SELECT id FROM films WHERE slug = ?").get(s);
  if (!taken(slug)) return slug;
  let i = 2;
  while (taken(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}

// ── TMDB types ────────────────────────────────────────────────────────────────

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
}

interface TMDBCast {
  name: string;
  character: string;
  order: number;
  profile_path: string | null;
}

interface TMDBCrew {
  job: string;
  name: string;
  profile_path: string | null;
}

interface TMDBVideo {
  site: string;
  key: string;
  type: string;
  official: boolean;
}

interface TMDBDetail {
  backdrop_path: string | null;
  credits: { cast: TMDBCast[]; crew: TMDBCrew[] };
  videos: { results: TMDBVideo[] };
}

// ── TMDB fetchers ─────────────────────────────────────────────────────────────

async function fetchPage(page: number): Promise<{ results: TMDBMovie[]; total_pages: number }> {
  const params = new URLSearchParams({
    api_key: TMDB_KEY,
    with_original_language: "hi",
    sort_by: "popularity.desc",
    "primary_release_date.gte": "2012-01-01",
    "primary_release_date.lte": "2025-12-31",
    "vote_count.gte": "50",
    page: String(page),
  });
  const res = await fetch(`https://api.themoviedb.org/3/discover/movie?${params}`);
  if (!res.ok) {
    if (res.status === 429) { await sleep(2000); return fetchPage(page); }
    throw new Error(`TMDB error ${res.status} on page ${page}`);
  }
  return res.json();
}

async function fetchDetails(tmdbId: number): Promise<TMDBDetail | null> {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=credits,videos`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 429) { await sleep(2000); return fetchDetails(tmdbId); }
    return null;
  }
  return res.json();
}

function extractTrailer(videos: TMDBVideo[]): string | null {
  const trailers = videos.filter(v => v.site === "YouTube" && v.type === "Trailer");
  const official = trailers.find(v => v.official);
  return (official ?? trailers[0])?.key ?? null;
}

// ── People helpers ────────────────────────────────────────────────────────────

const findPersonByName = db.prepare("SELECT id FROM people WHERE lower(name) = lower(?)");
const upsertPerson = db.prepare(`
  INSERT INTO people (name, slug, image_url, type)
  VALUES (@name, @slug, @image_url, @type)
  ON CONFLICT(slug) DO UPDATE SET image_url = COALESCE(excluded.image_url, people.image_url)
`);
const insertFilmPerson = db.prepare(`
  INSERT OR IGNORE INTO film_people (film_id, person_id, role, character)
  VALUES (@film_id, @person_id, @role, @character)
`);

function getOrCreatePerson(name: string, imageUrl: string | null, type: string): number {
  const existing = findPersonByName.get(name) as { id: number } | undefined;
  if (existing) {
    if (imageUrl) {
      db.prepare("UPDATE people SET image_url = COALESCE(?, image_url) WHERE id = ?").run(imageUrl, existing.id);
    }
    return existing.id;
  }
  const base = slugify(name);
  let slug = base;
  let i = 2;
  while (db.prepare("SELECT id FROM people WHERE slug = ?").get(slug)) slug = `${base}-${i++}`;
  const row = upsertPerson.run({ name, slug, image_url: imageUrl, type });
  return row.lastInsertRowid as number;
}

// ── DB insert / update statements ─────────────────────────────────────────────

const insertFilm = db.prepare(`
  INSERT OR IGNORE INTO films (
    title, year, rating, votes,
    poster_src, backdrop_src, summary, oneliner,
    slug, status, tmdb_id,
    trailer, stars, writers, music_directors, badges
  ) VALUES (
    @title, @year, @rating, @votes,
    @poster_src, @backdrop_src, @summary, @oneliner,
    @slug, @status, @tmdb_id,
    @trailer, @stars, @writers, @music_directors, @badges
  )
`);

const insertSong = db.prepare(`
  INSERT OR IGNORE INTO songs (film_id, title, youtube_id, category)
  VALUES (@film_id, @title, @youtube_id, @category)
`);

// ── Badge taxonomy (exact values used throughout the site) ────────────────────

const BADGE_LIST = [
  "Dishoom Dishoom", "100% Masala", "Cult Classic", "Love/Romance",
  "Angry Young Man", "Blockbuster", "Movies with a Message",
  "Candy-Floss/NRI Romance", "No Brain Required Comedy", "Star-Crossed Lovers",
  "Family Dysfunction", "Period Piece", "Parallel Cinema", "Timepass",
  "Thrilllerrr", "Hatkay", "Just Do It Dramas", "Drama", "Action",
  "Comedy", "Crime", "Feel Good", "Patriotic",
];

// ── Song tag taxonomy ─────────────────────────────────────────────────────────

const SONG_TAGS = [
  "romantic", "dance-floor", "item-number", "qawwali", "ghazal", "folk",
  "soulful", "earworm", "anthem", "tear-jerker", "heartbreak", "melancholy",
  "euphoric", "playful", "defiant", "bhajan", "sufi", "wedding", "patriotic",
  "devotional", "iconic", "evergreen", "ar-rahman", "lata-mangeshkar",
  "slow-burn", "singalong", "campfire", "monsoon", "rain-romance",
].join(", ");

// ── Few-shot examples for oneliner style ──────────────────────────────────────

const FEW_SHOT = [
  { t: "Om Shanti Om (2007)",    o: "Tongue explosively in-cheek, Director Farah Khan's homage to yesteryear's Bollywood is sizzling with masala: item numbers, reincarnation, sideburns, and so much more!" },
  { t: "Udaan (2010)",           o: "A refreshing look at youth, dreams, and the sometimes unpleasant complications of a father-son relationship — gritty, powerful, and worth your time." },
  { t: "Roja (1992)",            o: "Mani Ratnam's crisp storytelling and A.R. Rahman's stunning debut help Roja blossom into an enthralling tale of terrorism and love." },
  { t: "Jaani Dushman (2002)",   o: "Hideously cartoonish and senseless — a reminder that spending all your money on A-list stars doesn't guarantee a film that's watchable." },
  { t: "Kill (2024)",            o: "A commando's mission to rescue his fiancée turns the world's most violent train journey into a blood-soaked action showpiece." },
  { t: "Stree 2 (2024)",         o: "The witch is back — Chanderi's most fearless heroine returns to face a terrifying new supernatural threat." },
  { t: "Veer-Zaara (2004)",      o: "VZ embodies typical Yash Raj star-crossed lovers storytelling across the Indo-Pak border, and features exactly what you'd want from SRK." },
  { t: "Love Sex aur Dhokha (2010)", o: "Deeply cutting satire and an innovative approach to storytelling define LSAD, which reveals possibilities yet latent in Bollywood." },
].map(e => `Film: ${e.t}\nOneliner: ${e.o}`).join("\n\n");

// ── Claude: generate oneliner + badges + songs in one call ───────────────────

interface ClaudeFilmData {
  oneliner: string | null;
  badges: string[];
  songs: Array<{ title: string; tags: string[] }>;
}

async function generateFilmData(
  title: string,
  year: number | null,
  overview: string,
  director: string | null,
  leadCast: string[],
): Promise<ClaudeFilmData> {
  if (!anthropic || !overview.trim()) return { oneliner: null, badges: [], songs: [] };

  const castLine = leadCast.slice(0, 4).join(", ");

  const prompt = `You are the editorial voice of Dishoom Films, a Bollywood review site. For the film below, return a single JSON object with exactly three fields.

"oneliner" — a punchy critic blurb, 15–30 words. Opinionated — can praise, skewer, or be ambivalent. Names director or stars when relevant. No exclamation marks unless truly earned. Match this style exactly:

${FEW_SHOT}

"badges" — pick 1–3 vibe tags from this exact list only (use exact strings):
${BADGE_LIST.join(", ")}

"songs" — list the 3–6 most well-known songs from this film that you are genuinely confident about. Return an empty array if you are not confident. Each song needs:
  "title": exact song title
  "tags": 2–4 tags from: ${SONG_TAGS}

---
Film: ${title} (${year ?? "unknown"})${director ? `\nDirector: ${director}` : ""}${castLine ? `\nCast: ${castLine}` : ""}
Plot: ${overview}
---

Return only valid JSON, no markdown fences, no explanation:
{"oneliner":"...","badges":["..."],"songs":[{"title":"...","tags":["..."]}]}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    // Strip accidental markdown fences
    const json = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(json) as Partial<ClaudeFilmData>;

    return {
      oneliner: typeof parsed.oneliner === "string" && parsed.oneliner.trim() ? parsed.oneliner.trim() : null,
      badges:   Array.isArray(parsed.badges) ? parsed.badges.filter(b => BADGE_LIST.includes(b)) : [],
      songs:    Array.isArray(parsed.songs)  ? parsed.songs  : [],
    };
  } catch (err) {
    console.warn(`\n    [Claude] failed for "${title}": ${(err as Error).message}`);
    return { oneliner: null, badges: [], songs: [] };
  }
}

// ── YouTube song lookup ───────────────────────────────────────────────────────

const PREFERRED_YT_CHANNELS = new Set([
  "UCq-Fj5jknLsUf-MWSy4_brA", // T-Series
  "UCLK_BkHm0YTMVHFqPCHSAhg", // Sony Music India
  "UCRvm6_bE6v0CSnOlFMVpBoQ", // Zee Music Company
  "UCJrDMFOdv1I2k8n9oK_V21w", // Tips Official
  "UCNUYwRhZBo5O48SJLb5j0Ug", // YRF
  "UC6TE96JlxaqiAIHJOuHWNZA", // Speed Records
]);

async function findSongOnYouTube(songTitle: string, filmTitle: string, year: number | null): Promise<string | null> {
  if (!YOUTUBE_KEY) return null;

  const query = `${songTitle} ${filmTitle}${year ? ` ${year}` : ""} official audio`;
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("videoCategoryId", "10"); // Music
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("key", YOUTUBE_KEY);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json() as {
      items: { id: { videoId: string }; snippet: { channelId: string } }[];
    };
    if (!data.items?.length) return null;
    const preferred = data.items.find(i => PREFERRED_YT_CHANNELS.has(i.snippet.channelId));
    return (preferred ?? data.items[0]).id.videoId;
  } catch {
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  let page = 1;
  let totalPages = 1;
  let inserted = 0;
  let skipped = 0;

  console.log(`Importing recent Bollywood films (up to ${maxPages} pages)`);
  console.log(`Claude:  ${anthropic     ? "enabled (claude-haiku-4-5)" : "disabled — set ANTHROPIC_API_KEY"}`);
  console.log(`YouTube: ${YOUTUBE_KEY   ? "enabled"                    : "disabled — songs filled later by fetch-youtube-ids.ts"}\n`);

  while (page <= Math.min(totalPages, maxPages)) {
    process.stdout.write(`Page ${page}/${Math.min(totalPages, maxPages)}...`);
    const pageData = await fetchPage(page);
    totalPages = pageData.total_pages;

    for (const movie of pageData.results) {
      const year = movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : null;
      const titleLower = movie.title.toLowerCase();

      // Skip if already in DB
      const existingFilm = db.prepare(
        "SELECT id FROM films WHERE lower(title) = ? AND year = ?"
      ).get(titleLower, year) as { id: number } | undefined;

      if (existingFilm) { skipped++; continue; }

      // ── 1. TMDB full details (credits + videos) ────────────────────────────
      const detail = await fetchDetails(movie.id);
      await sleep(250);

      const cast      = (detail?.credits?.cast ?? []).filter(c => c.order < 10);
      const crew      = detail?.credits?.crew ?? [];
      const videos    = detail?.videos?.results ?? [];

      const directors  = crew.filter(c => c.job === "Director");
      const writers    = crew.filter(c => ["Screenplay", "Story", "Writer"].includes(c.job));
      const composers  = crew.filter(c => c.job === "Original Music Composer");

      const trailerKey    = extractTrailer(videos);
      const leadCastNames = cast.slice(0, 4).map(c => c.name);
      const directorName  = directors[0]?.name ?? null;
      const backdropUrl   = (detail?.backdrop_path ?? movie.backdrop_path)
        ? `${BACKDROP_BASE}${detail?.backdrop_path ?? movie.backdrop_path}`
        : null;

      // ── 2. Claude: oneliner + badges + songs ──────────────────────────────
      const claude = await generateFilmData(
        movie.title, year, movie.overview || "",
        directorName, leadCastNames,
      );

      // ── 3. Insert film row ─────────────────────────────────────────────────
      const slug = makeUniqueSlug(slugify(movie.title, year));

      insertFilm.run({
        title:           movie.title,
        year,
        rating:          movie.vote_average > 0 ? Math.round(movie.vote_average * 10) : null,
        votes:           movie.vote_count || 0,
        poster_src:      movie.poster_path ? `${IMAGE_BASE}${movie.poster_path}` : null,
        backdrop_src:    backdropUrl,
        summary:         movie.overview || null,
        oneliner:        claude.oneliner,
        slug,
        status:          null,
        tmdb_id:         movie.id,
        trailer:         trailerKey,
        stars:           leadCastNames.join(", ") || null,
        writers:         writers.map(w => w.name).join(", ") || null,
        music_directors: composers.map(c => c.name).join(", ") || null,
        badges:          claude.badges.join(",") || null,
      });

      // Get the newly-inserted film's DB id
      const filmRow = db.prepare(
        "SELECT id FROM films WHERE lower(title) = ? AND year = ?"
      ).get(titleLower, year) as { id: number } | undefined;
      if (!filmRow) { skipped++; continue; }
      const filmId = filmRow.id;

      // ── 4. Populate film_people (cast + director + writers + composers) ────
      const savePeople = db.transaction(() => {
        for (const c of cast) {
          const img      = c.profile_path ? `${PROFILE_BASE}${c.profile_path}` : null;
          const personId = getOrCreatePerson(c.name, img, "actor");
          insertFilmPerson.run({ film_id: filmId, person_id: personId, role: "actor", character: c.character || null });
        }
        for (const d of directors) {
          const img      = d.profile_path ? `${PROFILE_BASE}${d.profile_path}` : null;
          const personId = getOrCreatePerson(d.name, img, "director");
          insertFilmPerson.run({ film_id: filmId, person_id: personId, role: "director", character: null });
        }
        for (const w of writers.slice(0, 3)) {
          const img      = w.profile_path ? `${PROFILE_BASE}${w.profile_path}` : null;
          const personId = getOrCreatePerson(w.name, img, "writer");
          insertFilmPerson.run({ film_id: filmId, person_id: personId, role: "writer", character: null });
        }
        for (const c of composers) {
          const img      = c.profile_path ? `${PROFILE_BASE}${c.profile_path}` : null;
          const personId = getOrCreatePerson(c.name, img, "music_director");
          insertFilmPerson.run({ film_id: filmId, person_id: personId, role: "music_director", character: null });
        }
      });
      savePeople();

      // ── 5. Insert songs + search YouTube ──────────────────────────────────
      for (const song of claude.songs) {
        const youtubeId = await findSongOnYouTube(song.title, movie.title, year);
        if (YOUTUBE_KEY) await sleep(200);

        insertSong.run({
          film_id:    filmId,
          title:      song.title,
          youtube_id: youtubeId,
          category:   song.tags.join(",") || null,
        });
      }

      // ── Summary line ───────────────────────────────────────────────────────
      const parts: string[] = [];
      if (directorName) parts.push(`dir. ${directorName}`);
      if (cast.length)  parts.push(`${cast.length} cast`);
      if (trailerKey)   parts.push("trailer");
      if (claude.songs.length) parts.push(`${claude.songs.length} songs`);
      if (claude.badges.length) parts.push(claude.badges.join(", "));

      console.log(`\n  + ${movie.title} (${year})`);
      if (claude.oneliner) console.log(`    "${claude.oneliner}"`);
      if (parts.length)    console.log(`    ${parts.join(" | ")}`);

      inserted++;
      await sleep(300);
    }

    process.stdout.write(` inserted: ${inserted}, skipped: ${skipped}\n`);
    page++;
    await sleep(300);
  }

  // ── Final summary ─────────────────────────────────────────────────────────
  console.log(`\nDone!`);
  console.log(`  Inserted: ${inserted} new films`);
  console.log(`  Skipped:  ${skipped} already in DB`);

  const total = (db.prepare("SELECT COUNT(*) as n FROM films").get() as { n: number }).n;
  const withOneliner = (db.prepare("SELECT COUNT(*) as n FROM films WHERE oneliner IS NOT NULL AND oneliner != ''").get() as { n: number }).n;
  const withTrailer  = (db.prepare("SELECT COUNT(*) as n FROM films WHERE trailer IS NOT NULL AND trailer != ''").get() as { n: number }).n;
  const withCast     = (db.prepare("SELECT COUNT(DISTINCT film_id) as n FROM film_people").get() as { n: number }).n;
  const songCount    = (db.prepare("SELECT COUNT(*) as n FROM songs WHERE youtube_id IS NOT NULL").get() as { n: number }).n;

  console.log(`\n  DB totals:`);
  console.log(`    Films:         ${total.toLocaleString()}`);
  console.log(`    With oneliner: ${withOneliner.toLocaleString()}`);
  console.log(`    With trailer:  ${withTrailer.toLocaleString()}`);
  console.log(`    With cast:     ${withCast.toLocaleString()}`);
  console.log(`    Songs w/ YT:   ${songCount.toLocaleString()}`);

  db.close();
}

main().catch(console.error);
