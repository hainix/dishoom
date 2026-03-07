/**
 * Articles cron: generates ~10 Bollywood articles per day via Claude.
 *
 * Article types (run each day):
 *  - Film news       (4-5): recent TMDB releases, 2-3 backdrop images interspersed
 *  - Star spotlight  (2):   from DB people, TMDB person images
 *  - Listicle        (2):   rotating TOPICS, film posters per list item
 *  - Classic retro   (1):   anniversary/featured classic from DB with backdrop + poster
 *
 * Run directly:
 *   npx tsx -e "import('./lib/cron/articles').then(m => m.runArticlesCron())"
 */
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "../db";

const TMDB_KEY = process.env.TMDB_API_KEY ?? "f8a0148b386a3f00558c847eb9e4284f";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";
const POSTER_BASE = "https://image.tmdb.org/t/p/w500";
const PERSON_IMG_BASE = "https://image.tmdb.org/t/p/w780";

// ── Listicle topics (cycled daily) ──────────────────────────────────────────
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
  "10 Bollywood films every non-Bollywood fan should start with",
  "Best Bollywood ensemble cast films of all time",
];

// ── Star spotlight subjects (cycled daily) ───────────────────────────────────
const SPOTLIGHT_STARS = [
  "Shah Rukh Khan", "Amitabh Bachchan", "Madhuri Dixit", "Sridevi",
  "Hrithik Roshan", "Deepika Padukone", "Aamir Khan", "Salman Khan",
  "Kareena Kapoor Khan", "Rekha", "Dilip Kumar", "Rajesh Khanna",
  "Priyanka Chopra Jonas", "Aishwarya Rai Bachchan", "Ranveer Singh",
  "Akshay Kumar", "Katrina Kaif", "Ranbir Kapoor", "Vidya Balan",
  "Nawazuddin Siddiqui",
];

// ────────────────────────────────────────────────────────────────────────────

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

/** Wrap paragraphs in <p> tags with optional <figure> images interspersed */
function buildHtml(paragraphs: string[], images: Array<{ src: string; caption?: string }>): string {
  const result: string[] = [];
  let imgIdx = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    result.push(`<p>${paragraphs[i]}</p>`);

    // Insert an image after paragraphs 1 and 3 (0-indexed) if available
    if ((i === 1 || i === 3) && imgIdx < images.length) {
      const img = images[imgIdx++];
      const cap = img.caption ? `<figcaption>${img.caption}</figcaption>` : "";
      result.push(`<figure><img src="${img.src}" alt="${img.caption ?? ""}" loading="lazy" />${cap}</figure>`);
    }
  }

  // Append any remaining images at the end
  while (imgIdx < images.length) {
    const img = images[imgIdx++];
    const cap = img.caption ? `<figcaption>${img.caption}</figcaption>` : "";
    result.push(`<figure><img src="${img.src}" alt="${img.caption ?? ""}" loading="lazy" />${cap}</figure>`);
  }

  return result.join("\n");
}

// ── TMDB helpers ─────────────────────────────────────────────────────────────

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
}

interface TMDBCredits {
  crew: Array<{ job: string; name: string }>;
  cast: Array<{ name: string; order: number }>;
}

interface TMDBImages {
  backdrops: Array<{ file_path: string; vote_average: number }>;
  posters: Array<{ file_path: string; vote_average: number }>;
  profiles?: Array<{ file_path: string; vote_average: number }>;
}

async function tmdbGet<T>(path: string, extra?: Record<string, string>): Promise<T | null> {
  const params = new URLSearchParams({ api_key: TMDB_KEY, ...extra });
  const res = await fetch(`https://api.themoviedb.org/3${path}?${params}`);
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

async function fetchRecentFilms(): Promise<TMDBMovie[]> {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const data = await tmdbGet<{ results: TMDBMovie[] }>("/discover/movie", {
    with_original_language: "hi",
    sort_by: "release_date.desc",
    "primary_release_date.gte": fourteenDaysAgo,
    "primary_release_date.lte": today,
    "vote_count.gte": "5",
  });
  return data?.results.slice(0, 5) ?? [];
}

async function fetchFilmImages(tmdbId: number): Promise<TMDBImages> {
  const data = await tmdbGet<TMDBImages>(`/movie/${tmdbId}/images`);
  return data ?? { backdrops: [], posters: [] };
}

async function fetchPersonTmdbId(name: string): Promise<number | null> {
  const data = await tmdbGet<{ results: Array<{ id: number; name: string }> }>("/search/person", { query: name });
  return data?.results[0]?.id ?? null;
}

async function fetchPersonImages(personId: number): Promise<string[]> {
  const data = await tmdbGet<{ profiles: Array<{ file_path: string }> }>(`/person/${personId}/images`);
  return (data?.profiles ?? []).slice(0, 3).map((p) => `${PERSON_IMG_BASE}${p.file_path}`);
}

async function fetchCredits(tmdbId: number): Promise<TMDBCredits> {
  const data = await tmdbGet<TMDBCredits>(`/movie/${tmdbId}/credits`);
  return data ?? { crew: [], cast: [] };
}

// ── Voice system prompt (used in all generators) ─────────────────────────────

const DISHOOM_VOICE = `You write for Dishoom Films — a Bollywood review and gossip site with attitude. Your voice is:
- Casual and punchy, like a knowledgeable fan talking to a friend over chai
- Opinionated and direct — say what you think, don't sit on the fence
- Uses B-town insider shorthand where it fits (SRK, Big B, Akki, but don't overdo it)
- Short, sharp sentences. No flowery prose. No "one cannot help but notice" style.
- Dry wit is welcome. Reverence is not.
- Reads like a smart tabloid, not a film studies essay.`;

// ── Article generators ────────────────────────────────────────────────────────

async function generateFilmNewsArticle(
  client: Anthropic,
  movie: TMDBMovie,
  dateStr: string
): Promise<{ title: string; slug: string; description: string; content: string; thumbnail: string | null; celebrity: string | null } | null> {
  const credits = await fetchCredits(movie.id);
  const director = credits.crew.find((c) => c.job === "Director")?.name ?? null;
  const topCast = credits.cast.slice(0, 4).map((c) => c.name).join(", ");

  // Fetch backdrops for interspersing in article
  const imgs = await fetchFilmImages(movie.id);
  const backdrops = imgs.backdrops
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 3)
    .map((b) => ({ src: `${BACKDROP_BASE}${b.file_path}`, caption: movie.title }));
  // Fallback to movie.backdrop_path if no backdrops returned
  if (backdrops.length === 0 && movie.backdrop_path) {
    backdrops.push({ src: `${BACKDROP_BASE}${movie.backdrop_path}`, caption: movie.title });
  }

  const prompt = `${DISHOOM_VOICE}

Write a 5-paragraph article about "${movie.title}" (${movie.release_date?.slice(0, 4) ?? "recent"}).

Film details:
- Overview: ${movie.overview || "A new Bollywood release"}
- Director: ${director ?? "Unknown"}
- Cast: ${topCast || "Ensemble cast"}
- TMDB score: ${movie.vote_average.toFixed(1)}/10

Write exactly 5 paragraphs (no headings), 3-4 sentences each. Be opinionated. Cover:
P1: Hook — what's the deal with this film, why does it matter (or not), no throat-clearing
P2: What it's about — plot setup, no spoilers, but don't be boring about it
P3: The performances and direction — specific, honest
P4: Music, look, or whatever else stands out
P5: Verdict — who will love it, who should skip it, be direct

Also provide:
- title: punchy headline under 85 chars. No quotes. Make it sound like something you'd click.
- description: one snappy sentence under 150 chars

Return JSON only, no markdown fences:
{"title":"...","description":"...","paragraphs":["P1","P2","P3","P4","P5"]}`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  const clean = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  let parsed: { title: string; description: string; paragraphs: string[] };
  try { parsed = JSON.parse(jsonMatch[0]); } catch { return null; }

  const content = buildHtml(parsed.paragraphs ?? [], backdrops);
  const thumbnail = movie.poster_path ? `${POSTER_BASE}${movie.poster_path}` : null;

  return {
    title: parsed.title,
    slug: `${slugify(movie.title)}-${dateStr}`,
    description: parsed.description,
    content,
    thumbnail,
    celebrity: director ?? (credits.cast[0]?.name ?? null),
  };
}

async function generateStarSpotlight(
  client: Anthropic,
  starName: string,
  dateStr: string
): Promise<{ title: string; slug: string; description: string; content: string; thumbnail: string | null; celebrity: string } | null> {
  const personId = await fetchPersonTmdbId(starName);
  const personImages = personId ? await fetchPersonImages(personId) : [];
  const images = personImages.map((src) => ({ src, caption: starName }));

  const prompt = `${DISHOOM_VOICE}

Write a 5-paragraph profile of Bollywood star "${starName}".

Write exactly 5 paragraphs (no headings), 3-4 sentences each. Be specific — name actual films, songs, moments. Don't just say "iconic", show why. Cover:
P1: Who are they, really? Lead with the most interesting thing about them.
P2: How they got here — early career, the role that changed everything
P3: The films and performances that define them — pick the best ones and say something real about them
P4: Off-screen persona, controversies, or cultural impact — the stuff fans actually talk about
P5: Where they stand today and what their legacy actually is

Also provide:
- title: a headline that makes you want to read it (max 85 chars, no quotes)
- description: one sharp sentence (max 150 chars)

Return JSON only, no markdown fences:
{"title":"...","description":"...","paragraphs":["P1","P2","P3","P4","P5"]}`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  const clean = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  let parsed: { title: string; description: string; paragraphs: string[] };
  try { parsed = JSON.parse(jsonMatch[0]); } catch { return null; }

  const content = buildHtml(parsed.paragraphs ?? [], images);
  const thumbnail = images[0]?.src ?? null;

  return {
    title: parsed.title,
    slug: `${slugify(starName)}-spotlight-${dateStr}`,
    description: parsed.description,
    content,
    thumbnail,
    celebrity: starName,
  };
}

async function generateListicle(
  client: Anthropic,
  topic: string,
  dateStr: string
): Promise<{ title: string; slug: string; description: string; content: string; thumbnail: string | null } | null> {
  // Fetch posters for films matching the topic from DB
  const db = getDb();
  type PosterRow = { title: string; posterSrc: string | null; year: number | null };
  const dbFilms = db.prepare(
    `SELECT title, poster_src as posterSrc, year FROM films
     WHERE poster_src IS NOT NULL AND rating IS NOT NULL
     ORDER BY rating DESC LIMIT 15`
  ).all() as PosterRow[];

  const prompt = `${DISHOOM_VOICE}

Write a listicle about: "${topic}"

Write a sharp intro paragraph (3-4 sentences — make an argument, don't just describe what the list is), then exactly 10 numbered items.
Each item: <strong>[Film or Name]</strong> — 2-3 sentences. Be specific about why it's on the list. Have opinions.
Do NOT use <ol> or <li> tags. Format each as plain text like:
1. <strong>Film Title</strong> — Here's why it belongs here.
...

Also provide:
- title: punchy headline under 85 chars
- description: one sentence under 150 chars

Return JSON only, no markdown fences:
{"title":"...","description":"...","intro":"intro paragraph","items":["1. <strong>...</strong> — ...","2. ...","..."]}`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1400,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  const clean = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  let parsed: { title: string; description: string; intro: string; items: string[] };
  try { parsed = JSON.parse(jsonMatch[0]); } catch { return null; }

  // Build HTML: intro paragraph, then items with poster images interspersed every 3
  const parts: string[] = [`<p>${parsed.intro}</p>`];
  const items = parsed.items ?? [];
  for (let i = 0; i < items.length; i++) {
    parts.push(`<p>${items[i]}</p>`);
    // Intersperse a random DB poster every 3 items
    if ((i + 1) % 3 === 0 && dbFilms.length > 0) {
      const film = dbFilms[(i / 3) % dbFilms.length];
      if (film?.posterSrc) {
        parts.push(`<figure><img src="${film.posterSrc}" alt="${film.title}" loading="lazy" /><figcaption>${film.title}${film.year ? ` (${film.year})` : ""}</figcaption></figure>`);
      }
    }
  }

  const thumbnail = dbFilms[0]?.posterSrc ?? null;

  return {
    title: parsed.title || topic,
    slug: `${slugify(topic)}-${dateStr}`,
    description: parsed.description,
    content: parts.join("\n"),
    thumbnail,
  };
}

async function generateClassicRetro(
  client: Anthropic,
  dateStr: string
): Promise<{ title: string; slug: string; description: string; content: string; thumbnail: string | null; celebrity: string | null } | null> {
  const db = getDb();

  type ClassicFilm = { id: number; title: string; year: number | null; slug: string; rating: number | null; posterSrc: string | null; backdropSrc: string | null; plot: string | null; stars: string | null; tmdbId: number | null };

  // Pick a random high-rated classic (1970-2005) that has a backdrop
  const film = db.prepare(
    `SELECT id, title, year, slug, rating, poster_src as posterSrc, backdrop_src as backdropSrc,
            plot, stars, tmdb_id as tmdbId
     FROM films
     WHERE rating >= 70 AND year BETWEEN 1970 AND 2005
       AND backdrop_src IS NOT NULL AND poster_src IS NOT NULL
       AND (plot IS NOT NULL AND plot != '')
     ORDER BY RANDOM() LIMIT 1`
  ).get() as ClassicFilm | undefined;

  if (!film) return null;

  // Collect images: backdrop first, then poster
  const images: Array<{ src: string; caption: string }> = [];
  if (film.backdropSrc) images.push({ src: film.backdropSrc, caption: film.title });
  if (film.posterSrc && film.posterSrc !== film.backdropSrc) images.push({ src: film.posterSrc, caption: `${film.title}${film.year ? ` (${film.year})` : ""}` });

  // Optionally fetch more backdrops from TMDB
  if (film.tmdbId) {
    const tmdbImgs = await fetchFilmImages(film.tmdbId);
    const extra = tmdbImgs.backdrops
      .sort((a, b) => b.vote_average - a.vote_average)
      .slice(0, 1)
      .map((b) => ({ src: `${BACKDROP_BASE}${b.file_path}`, caption: film.title }));
    images.push(...extra);
  }

  const prompt = `${DISHOOM_VOICE}

Write a 5-paragraph retrospective about the classic Bollywood film "${film.title}" (${film.year ?? "classic era"}).

Film details:
- Plot: ${film.plot ?? "A landmark of Indian cinema"}
- Stars: ${film.stars ?? "Iconic cast"}
- Dishoom rating: ${film.rating ?? "N/A"}/100

Write exactly 5 paragraphs (no headings), 3-4 sentences each. Be specific — mention actual scenes, songs, dialogue. Don't just say it's a classic, make the reader feel why. Cover:
P1: Lead with the most arresting thing about the film — a scene, a line, a moment that stays with you
P2: The story and how it's told — what makes the screenplay or direction interesting
P3: The performances — who delivers and how, with specifics
P4: The music, look, and atmosphere — songs that defined careers, scenes that defined the era
P5: Why it still holds up (or where it shows its age) — be honest, not just reverential

Also provide:
- title: retrospective headline with the film name (max 85 chars, no quotes)
- description: one evocative sentence (max 150 chars)

Return JSON only, no markdown fences:
{"title":"...","description":"...","paragraphs":["P1","P2","P3","P4","P5"]}`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
  const clean = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  let parsed: { title: string; description: string; paragraphs: string[] };
  try { parsed = JSON.parse(jsonMatch[0]); } catch { return null; }

  const content = buildHtml(parsed.paragraphs ?? [], images);

  return {
    title: parsed.title,
    slug: `retro-${slugify(film.title)}-${dateStr}`,
    description: parsed.description,
    content,
    thumbnail: film.backdropSrc ?? film.posterSrc,
    celebrity: film.stars?.split(",")[0]?.trim() ?? null,
  };
}

// ── Main cron ────────────────────────────────────────────────────────────────

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

  function tryInsert(art: { title: string; slug: string; description: string; content: string; thumbnail: string | null; celebrity?: string | null }) {
    const result = insertArticle.run({
      title: art.title,
      slug: art.slug,
      description: art.description,
      content: art.content,
      thumbnail: art.thumbnail,
      celebrity: art.celebrity ?? null,
    });
    if (result.changes > 0) inserted++;
  }

  function alreadyExists(slug: string): boolean {
    return !!db.prepare("SELECT id FROM articles WHERE slug = ?").get(slug);
  }

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // ── 1. Film news articles (up to 5) ────────────────────────────────────────
  console.log("[cron:articles] Fetching recent films...");
  const films = await fetchRecentFilms();
  for (const movie of films) {
    const slug = `${slugify(movie.title)}-${dateStr}`;
    if (alreadyExists(slug)) continue;
    try {
      const art = await generateFilmNewsArticle(client, movie, dateStr);
      if (art) tryInsert(art);
      console.log(`[cron:articles] film news: ${movie.title}`);
    } catch (err) {
      console.error(`[cron:articles] film news failed for "${movie.title}":`, err);
    }
    await delay(600);
  }

  // ── 2. Star spotlights (2 per day) ─────────────────────────────────────────
  const starStart = (doy * 2) % SPOTLIGHT_STARS.length;
  const todayStars = [
    SPOTLIGHT_STARS[starStart % SPOTLIGHT_STARS.length],
    SPOTLIGHT_STARS[(starStart + 1) % SPOTLIGHT_STARS.length],
  ];

  for (const star of todayStars) {
    const slug = `${slugify(star)}-spotlight-${dateStr}`;
    if (alreadyExists(slug)) continue;
    try {
      const art = await generateStarSpotlight(client, star, dateStr);
      if (art) tryInsert(art);
      console.log(`[cron:articles] star spotlight: ${star}`);
    } catch (err) {
      console.error(`[cron:articles] spotlight failed for "${star}":`, err);
    }
    await delay(600);
  }

  // ── 3. Listicles (2 per day) ────────────────────────────────────────────────
  const topicStart = (doy * 2) % TOPICS.length;
  const todayTopics = [
    TOPICS[topicStart % TOPICS.length],
    TOPICS[(topicStart + 1) % TOPICS.length],
  ];

  for (const topic of todayTopics) {
    const slug = `${slugify(topic)}-${dateStr}`;
    if (alreadyExists(slug)) continue;
    try {
      const art = await generateListicle(client, topic, dateStr);
      if (art) tryInsert({ ...art, celebrity: null });
      console.log(`[cron:articles] listicle: ${topic}`);
    } catch (err) {
      console.error(`[cron:articles] listicle failed for "${topic}":`, err);
    }
    await delay(600);
  }

  // ── 4. Classic retrospective (1 per day) ───────────────────────────────────
  const retroSlug = `retro-classic-${dateStr}`;
  // We can't easily pre-check since the film is random — just try and let INSERT OR IGNORE handle duplication via slug
  const existsRetro = db.prepare("SELECT id FROM articles WHERE slug LIKE ?").get(`retro-%-${dateStr}`);
  if (!existsRetro) {
    try {
      const art = await generateClassicRetro(client, dateStr);
      if (art) tryInsert(art);
      if (art) console.log(`[cron:articles] classic retro: ${art.title}`);
    } catch (err) {
      console.error("[cron:articles] classic retro failed:", err);
    }
  }

  console.log(`[cron:articles] Done — ${inserted} articles inserted`);
  void retroSlug; // suppress unused var warning
}
