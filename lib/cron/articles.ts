/**
 * Articles cron: generates ~10 Bollywood articles per day via Claude.
 * - 7 film-specific news articles (recent TMDB releases)
 * - 3 rotating top-list articles
 *
 * Can also be run directly:
 *   npx tsx -e "import('./lib/cron/articles').then(m => m.runArticlesCron())"
 */
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "../db";

const TMDB_KEY = process.env.TMDB_API_KEY ?? "f8a0148b386a3f00558c847eb9e4284f";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const TOPICS = [
  "Top 10 Bollywood films of the 1990s you need to watch",
  "Best Bollywood villains of all time",
  "10 AR Rahman compositions that defined Bollywood music",
  "Greatest romantic Bollywood songs of the 2000s",
  "Best Bollywood films directed by women",
  "Top 10 Bollywood dance numbers of all time",
  "Greatest Bollywood coming-of-age films",
  "10 underrated Bollywood gems from the 1970s",
  "Best Bollywood thrillers ever made",
  "Top 10 Bollywood sports films",
  "Greatest Bollywood songs about friendship",
  "10 Bollywood films that broke box office records",
  "Best Bollywood historical epics",
  "Top 10 Bollywood comedies of the 2000s",
  "Greatest mother characters in Bollywood history",
  "10 Bollywood films with unforgettable climaxes",
  "Best Bollywood films set outside India",
  "Top 10 Bollywood debut performances of all time",
  "Greatest Bollywood revenge films",
  "10 Bollywood films that sparked social change",
  "Best Bollywood horror films of all time",
  "Top 10 Bollywood biopics",
  "Greatest Bollywood action heroes ranked",
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  vote_average: number;
  genre_ids: number[];
}

interface TMDBCredits {
  crew: Array<{ job: string; name: string }>;
  cast: Array<{ name: string; order: number }>;
}

async function fetchRecentFilms(): Promise<TMDBMovie[]> {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({
    api_key: TMDB_KEY,
    with_original_language: "hi",
    sort_by: "release_date.desc",
    "primary_release_date.gte": fourteenDaysAgo,
    "primary_release_date.lte": today,
    "vote_count.gte": "5",
  });
  const res = await fetch(`https://api.themoviedb.org/3/discover/movie?${params}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { results: TMDBMovie[] };
  return data.results.slice(0, 7);
}

async function fetchCredits(tmdbId: number): Promise<TMDBCredits> {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${TMDB_KEY}`
  );
  if (!res.ok) return { crew: [], cast: [] };
  return res.json();
}

async function generateFilmArticle(
  client: Anthropic,
  movie: TMDBMovie,
  credits: TMDBCredits,
  dateStr: string
): Promise<{
  title: string;
  slug: string;
  description: string;
  content: string;
  celebrity: string | null;
}> {
  const director = credits.crew.find((c) => c.job === "Director")?.name ?? null;
  const topCast = credits.cast
    .slice(0, 3)
    .map((c) => c.name)
    .join(", ");

  const prompt = `Write a 3-paragraph Bollywood news article about the film "${movie.title}" (${movie.release_date?.slice(0, 4) ?? "recent"}).

Film details:
- Overview: ${movie.overview || "A new Bollywood release"}
- Director: ${director ?? "Unknown"}
- Cast: ${topCast || "Ensemble cast"}
- TMDB score: ${movie.vote_average.toFixed(1)}/10

Paragraph 1: Introduction and what the film is about
Paragraph 2: Critical reception and standout elements
Paragraph 3: Cultural impact and recommendation

Also provide:
- title: punchy article headline (max 80 chars)
- description: one sentence summary (max 150 chars)

Respond with JSON only:
{"title":"...","description":"...","content":"<p>...</p><p>...</p><p>...</p>"}`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in response");
  const parsed = JSON.parse(jsonMatch[0]) as { title: string; description: string; content: string };

  return {
    title: parsed.title,
    slug: `${slugify(movie.title)}-${dateStr}`,
    description: parsed.description,
    content: parsed.content,
    celebrity: director ?? (credits.cast[0]?.name ?? null),
  };
}

async function generateTopListArticle(
  client: Anthropic,
  topic: string,
  dateStr: string
): Promise<{
  title: string;
  slug: string;
  description: string;
  content: string;
}> {
  const prompt = `Write a 400-word Bollywood listicle article with the topic: "${topic}"

Include:
- A numbered list of 10 items with brief (2-3 sentence) descriptions for each
- An introductory paragraph

Also provide a one-sentence description (max 150 chars).

Respond with JSON only:
{"title":"${topic}","description":"...","content":"<p>...</p><ol><li>...</li>...</ol>"}`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1200,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in response");
  const parsed = JSON.parse(jsonMatch[0]) as { title: string; description: string; content: string };

  return {
    title: parsed.title || topic,
    slug: `${slugify(topic)}-${dateStr}`,
    description: parsed.description,
    content: parsed.content,
  };
}

export async function runArticlesCron(): Promise<void> {
  const db = getDb();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const doy = dayOfYear(today);

  const insertArticle = db.prepare(`
    INSERT OR IGNORE INTO articles (title, slug, description, content, thumbnail, celebrity, is_spotlight)
    VALUES (@title, @slug, @description, @content, @thumbnail, @celebrity, 0)
  `);

  let inserted = 0;

  // ── Film news articles ─────────────────────────────────────────────────────
  const films = await fetchRecentFilms();
  for (const movie of films) {
    // Skip if we already wrote an article about this film today
    const slugCheck = `${slugify(movie.title)}-${dateStr}`;
    const exists = db.prepare("SELECT id FROM articles WHERE slug = ?").get(slugCheck);
    if (exists) continue;

    try {
      const credits = await fetchCredits(movie.id);
      const article = await generateFilmArticle(client, movie, credits, dateStr);
      const result = insertArticle.run({
        title: article.title,
        slug: article.slug,
        description: article.description,
        content: article.content,
        thumbnail: movie.poster_path ? `${IMAGE_BASE}${movie.poster_path}` : null,
        celebrity: article.celebrity,
      });
      if (result.changes > 0) inserted++;
    } catch (err) {
      console.error(`[cron:articles] failed for "${movie.title}":`, err);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  // ── Top-list articles ──────────────────────────────────────────────────────
  const topicStart = (doy * 3) % TOPICS.length;
  const todayTopics = [
    TOPICS[topicStart % TOPICS.length],
    TOPICS[(topicStart + 1) % TOPICS.length],
    TOPICS[(topicStart + 2) % TOPICS.length],
  ];

  for (const topic of todayTopics) {
    const slugCheck = `${slugify(topic)}-${dateStr}`;
    const exists = db.prepare("SELECT id FROM articles WHERE slug = ?").get(slugCheck);
    if (exists) continue;

    try {
      const article = await generateTopListArticle(client, topic, dateStr);
      const result = insertArticle.run({
        title: article.title,
        slug: article.slug,
        description: article.description,
        content: article.content,
        thumbnail: null,
        celebrity: null,
      });
      if (result.changes > 0) inserted++;
    } catch (err) {
      console.error(`[cron:articles] top-list failed for "${topic}":`, err);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`[cron:articles] ${inserted} articles inserted`);
}
