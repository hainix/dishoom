/**
 * Films cron: ingests new Hindi TMDB releases from the last 7 days,
 * then generates 3 synthetic critic reviews per new film via Claude.
 *
 * Can also be run directly:
 *   npx tsx -e "import('./lib/cron/films').then(m => m.runFilmsCron())"
 */
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "../db";

const TMDB_KEY = process.env.TMDB_API_KEY ?? "f8a0148b386a3f00558c847eb9e4284f";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const REVIEW_SOURCES = ["Film Companion", "NDTV Movies", "Bollywood Hungama", "Filmfare", "Pinkvilla"];

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
}

interface TMDBGenre {
  id: number;
  name: string;
}

let genreMap: Record<number, string> = {};

async function loadGenres(): Promise<void> {
  const res = await fetch(
    `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_KEY}&language=en`
  );
  if (!res.ok) return;
  const data = (await res.json()) as { genres: TMDBGenre[] };
  genreMap = Object.fromEntries(data.genres.map((g) => [g.id, g.name]));
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

function makeUniqueSlug(db: ReturnType<typeof getDb>, slug: string): string {
  if (!db.prepare("SELECT id FROM films WHERE slug = ?").get(slug)) return slug;
  let i = 2;
  while (db.prepare("SELECT id FROM films WHERE slug = ?").get(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}

interface SyntheticReview {
  reviewer: string;
  source: string;
  rating: number;
  excerpt: string;
}

async function generateReviews(
  client: Anthropic,
  title: string,
  year: number | null,
  overview: string,
  genres: string[],
  voteAverage: number
): Promise<SyntheticReview[]> {
  const prompt = `You are a film critic. Generate 3 short critic reviews for the Bollywood film "${title}" (${year ?? "recent"}).

Film info:
- Overview: ${overview || "No overview available"}
- Genres: ${genres.join(", ") || "Drama"}
- TMDB score: ${voteAverage.toFixed(1)}/10

Write 3 reviews with different sentiments: one positive, one mixed, one negative.
For each review provide:
- reviewer: a plausible Indian critic name
- source: one of ${REVIEW_SOURCES.join(", ")}
- rating: integer 0-100 matching the sentiment
- excerpt: 1-2 sentences of critic blurb

Respond with a JSON array only, no markdown:
[{"reviewer":"...","source":"...","rating":82,"excerpt":"..."},...]`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  return JSON.parse(jsonMatch[0]) as SyntheticReview[];
}

export async function runFilmsCron(): Promise<void> {
  const db = getDb();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  await loadGenres();

  // Fetch TMDB releases from last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  let allMovies: TMDBMovie[] = [];
  for (let page = 1; page <= 2; page++) {
    const params = new URLSearchParams({
      api_key: TMDB_KEY,
      with_original_language: "hi",
      sort_by: "release_date.desc",
      "primary_release_date.gte": sevenDaysAgo,
      "primary_release_date.lte": today,
      "vote_count.gte": "10",
      page: String(page),
    });
    const res = await fetch(`https://api.themoviedb.org/3/discover/movie?${params}`);
    if (!res.ok) break;
    const data = (await res.json()) as { results: TMDBMovie[]; total_pages: number };
    allMovies = allMovies.concat(data.results);
    if (page >= data.total_pages) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  const insertFilm = db.prepare(`
    INSERT OR IGNORE INTO films
      (title, year, rating, votes, poster_src, backdrop_src, summary, slug, status, tmdb_id)
    VALUES
      (@title, @year, @rating, @votes, @posterSrc, @backdropSrc, @summary, @slug, @status, @tmdbId)
  `);

  const insertReview = db.prepare(`
    INSERT INTO reviews (film_id, reviewer, source_name, rating, excerpt)
    VALUES (@filmId, @reviewer, @sourceName, @rating, @excerpt)
  `);

  let filmsInserted = 0;
  let reviewsInserted = 0;

  for (const movie of allMovies) {
    // Skip if already in DB by tmdb_id
    const existing = db.prepare("SELECT id FROM films WHERE tmdb_id = ?").get(movie.id);
    if (existing) continue;

    const year = movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : null;
    const rating = movie.vote_average > 0 ? Math.round(movie.vote_average * 10) : null;
    const slug = makeUniqueSlug(db, slugify(movie.title, year));

    const result = insertFilm.run({
      title: movie.title,
      year,
      rating,
      votes: movie.vote_count || 0,
      posterSrc: movie.poster_path ? `${IMAGE_BASE}${movie.poster_path}` : null,
      backdropSrc: movie.backdrop_path ? `${IMAGE_BASE}${movie.backdrop_path}` : null,
      summary: movie.overview || null,
      slug,
      status: "in_theaters",
      tmdbId: movie.id,
    });

    if (result.changes === 0) continue;
    filmsInserted++;

    const filmId = (db.prepare("SELECT id FROM films WHERE tmdb_id = ?").get(movie.id) as { id: number }).id;
    const genres = movie.genre_ids.map((id) => genreMap[id]).filter(Boolean);

    try {
      const reviews = await generateReviews(
        client,
        movie.title,
        year,
        movie.overview,
        genres,
        movie.vote_average
      );
      for (const r of reviews) {
        insertReview.run({
          filmId,
          reviewer: r.reviewer,
          sourceName: r.source,
          rating: r.rating,
          excerpt: r.excerpt,
        });
        reviewsInserted++;
      }
    } catch (err) {
      console.error(`[cron:films] review generation failed for "${movie.title}":`, err);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`[cron:films] ${filmsInserted} films inserted, ${reviewsInserted} reviews inserted`);
}
