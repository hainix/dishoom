/**
 * Imports recent Bollywood films (2012–2025) from TMDB.
 * Uses /discover/movie filtered to Hindi-language films, sorted by popularity.
 * Fetches up to 20 pages (~400 films), inserting only those not already in the DB.
 * Generates one-liners via Claude for each new film in the Dishoom editorial voice.
 *
 * Usage:
 *   npx tsx scripts/import-recent-films.ts
 *   npx tsx scripts/import-recent-films.ts --pages 5  # test with fewer pages
 */

import Database from "better-sqlite3";
import Anthropic from "@anthropic-ai/sdk";
import path from "path";

const API_KEY = process.env.TMDB_API_KEY || "f8a0148b386a3f00558c847eb9e4284f";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const DELAY_MS = 300;

const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = OFF");

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
  let i = 2;
  while (db.prepare("SELECT id FROM films WHERE slug = ?").get(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}

// ── One-liner generation ───────────────────────────────────────────────────────

const FEW_SHOT_EXAMPLES = [
  {
    title: "Om Shanti Om", year: 2007, overview: "A junior artist falls in love with a top actress in the 1970s and is reborn as a top star three decades later.",
    oneliner: "Tongue explosively in-cheek, Director Farah Khan's homage to yesteryear's Bollywood is sizzling with masala: item numbers, reincarnation, sideburns, and so much more!",
  },
  {
    title: "Udaan", year: 2010, overview: "A teenager is sent away to boarding school by his strict father, but when he returns home he finds himself caught between his father's iron will and his own dreams of becoming a writer.",
    oneliner: "A refreshing look at youth, dreams, and the sometimes unpleasant complications of a father-son relationship, Udaan is gritty, powerful, and definitely worth checking out.",
  },
  {
    title: "Roja", year: 1992, overview: "A newlywed woman fights to free her husband, a government official who has been taken hostage by militants in Kashmir.",
    oneliner: "Director Mani Ratnam's crisp storytelling and A.R. Rahman's stunning debut help Roja blossom into an enthralling tale of terrorism and love.",
  },
  {
    title: "Jaani Dushman: Ek Anokhi Kahani", year: 2002, overview: "A group of college students are stalked and killed by a supernatural entity.",
    oneliner: "Hideously cartoonish and senseless, Jaani Dushman reminds Bollywood that spending all your money on A-list actors doesn't guarantee a movie that's watchable.",
  },
  {
    title: "Veer-Zaara", year: 2004, overview: "An Indian pilot falls in love with a Pakistani girl across the political divide of their countries.",
    oneliner: "VZ embodies typical Yash Raj star-crossed lovers storytelling, albeit in a new setting across the Indo-Pak border, and features exactly what you'd want from SRK.",
  },
  {
    title: "Love Sex aur Dhokha", year: 2010, overview: "Three stories told through video footage explore sexuality, relationships and violence in contemporary India.",
    oneliner: "Deeply cutting satire and an innovative approach to storytelling define LSAD, which reveals possibilities yet latent in Bollywood just as it reveals us.",
  },
  {
    title: "Chhaava", year: 2025, overview: "The story of Maratha warrior king Sambhaji Maharaj and his resistance against the Mughal emperor Aurangzeb.",
    oneliner: "Maratha emperor Sambhaji Maharaj rises against Aurangzeb's Mughal forces in this grand historical epic.",
  },
  {
    title: "Kill", year: 2024, overview: "A commando boards a train to stop the engagement of his love interest, but ends up fighting for survival when a large gang of robbers take over the train.",
    oneliner: "A commando's mission to rescue his fiancée turns the world's most violent train journey into a blood-soaked action showpiece.",
  },
];

async function generateOneliner(
  title: string,
  year: number | null,
  overview: string,
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!overview.trim()) return null;

  const examples = FEW_SHOT_EXAMPLES.map(
    (e) => `Film: ${e.title} (${e.year})\nPlot: ${e.overview}\nOneliner: ${e.oneliner}`
  ).join("\n\n");

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 120,
      messages: [
        {
          role: "user",
          content: `You write one-liner blurbs for Dishoom Films, a Bollywood review site. The voice is that of a sharp, witty film critic — punchy, opinionated, and knowledgeable. Blurbs are 1–2 sentences (15–30 words). They can praise, skewer, or be ambivalent. They name directors and stars when relevant. They never use hashtags or exclamation marks unless genuinely warranted.

Examples:

${examples}

Now write a one-liner for this film. Output only the one-liner, no quotes, no explanation.

Film: ${title} (${year ?? "unknown"})
Plot: ${overview}
Oneliner:`,
        },
      ],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : null;
    return text || null;
  } catch (err) {
    console.warn(`    [Claude] failed for "${title}":`, (err as Error).message);
    return null;
  }
}

// ── TMDB fetching ─────────────────────────────────────────────────────────────

async function fetchPage(page: number): Promise<{ results: TMDBMovie[]; total_pages: number }> {
  const params = new URLSearchParams({
    api_key: API_KEY,
    with_original_language: "hi",
    sort_by: "popularity.desc",
    "primary_release_date.gte": "2012-01-01",
    "primary_release_date.lte": "2025-12-31",
    "vote_count.gte": "50",
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
    (title, year, rating, votes, poster_src, backdrop_src, summary, oneliner, slug, status, tmdb_id)
  VALUES
    (@title, @year, @rating, @votes, @poster_src, @backdrop_src, @summary, @oneliner, @slug, @status, @tmdb_id)
`);

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  let page = 1;
  let totalPages = 1;
  let inserted = 0;
  let skipped = 0;

  const hasClaudeKey = !!process.env.ANTHROPIC_API_KEY;
  console.log(`Importing recent Bollywood films from TMDB (up to ${maxPages} pages)...`);
  console.log(`One-liner generation: ${hasClaudeKey ? "enabled (Claude Haiku)" : "disabled (set ANTHROPIC_API_KEY to enable)"}\n`);

  while (page <= Math.min(totalPages, maxPages)) {
    process.stdout.write(`  Page ${page}/${Math.min(totalPages, maxPages)}...`);
    const data = await fetchPage(page);
    totalPages = data.total_pages;

    for (const movie of data.results) {
      const year = movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : null;
      const titleLower = movie.title.toLowerCase();

      const existing = db.prepare(
        "SELECT id FROM films WHERE lower(title) = ? AND year = ?"
      ).get(titleLower, year);

      if (existing) {
        skipped++;
        continue;
      }

      const rating = movie.vote_average > 0
        ? Math.round(movie.vote_average * 10)
        : null;

      const slug = makeUniqueSlug(slugify(movie.title, year));
      const posterUrl = movie.poster_path ? `${IMAGE_BASE}${movie.poster_path}` : null;
      const backdropUrl = movie.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
        : null;

      const oneliner = await generateOneliner(movie.title, year, movie.overview || "");

      insertFilm.run({
        title: movie.title,
        year,
        rating,
        votes: movie.vote_count || 0,
        poster_src: posterUrl,
        backdrop_src: backdropUrl,
        summary: movie.overview || null,
        oneliner: oneliner ?? null,
        slug,
        status: null,
        tmdb_id: movie.id,
      });

      if (oneliner) {
        console.log(`\n    + ${movie.title} (${year}): "${oneliner}"`);
      }

      inserted++;
      if (hasClaudeKey) await sleep(200); // small gap between Claude calls
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
