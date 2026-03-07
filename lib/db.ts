/**
 * Database utility using better-sqlite3
 * Provides typed query functions for all pages
 */
import Database from "better-sqlite3";
import path from "path";

// Singleton DB connection
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type FilmStatus = 'in_theaters' | 'streaming' | 'coming_soon' | 'released';

export interface Film {
  id: number;
  oldId: number | null;
  title: string;
  year: number | null;
  slug: string;
  rating: number | null;
  votes: number;
  stars: string | null;
  badges: string | null;
  summary: string | null;
  plot: string | null;
  oneliner: string | null;
  posterSrc: string | null;
  backdropSrc: string | null;
  trailer: string | null;
  writers: string | null;
  musicDirectors: string | null;
  wikiHandle: string | null;
  status: string;
  tmdbId: number | null;
}

export interface VibeStat {
  badge: string;
  count: number;
  posterSrc: string | null;
}

export interface Review {
  id: number;
  filmId: number;
  reviewer: string | null;
  sourceName: string | null;
  sourceLink: string | null;
  rating: number | null;
  excerpt: string | null;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  thumbnail: string | null;
  celebrity: string | null;
  isSpotlight: number;
  createdAt: string;
  filmId: number | null;
  filmTitle: string | null;
  filmSlug: string | null;
}

export interface Song {
  id: number;
  filmId: number;
  title: string | null;
  youtubeId: string | null;
  category: string | null;
}

export interface Person {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  bio: string | null;
  type: string | null;
  birthdate: string | null;
  birthplace: string | null;
}

export interface CastMember {
  personId: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  role: string;
  character: string | null;
}

// ── Shared SELECT fragments ───────────────────────────────────────────────────

const FILM_SELECT = `
  f.id, f.old_id as oldId, f.title, f.year, f.slug, f.rating, f.votes, f.stars, f.badges, f.summary,
  f.plot, f.oneliner, f.poster_src as posterSrc, f.backdrop_src as backdropSrc,
  f.trailer, f.writers, f.music_directors as musicDirectors,
  f.wiki_handle as wikiHandle, f.status, f.tmdb_id as tmdbId
`;

const FILM_SELECT_PLAIN = `
  id, old_id as oldId, title, year, slug, rating, votes, stars, badges, summary,
  plot, oneliner, poster_src as posterSrc, backdrop_src as backdropSrc,
  trailer, writers, music_directors as musicDirectors,
  wiki_handle as wikiHandle, status, tmdb_id as tmdbId
`;

// ── Film queries ──────────────────────────────────────────────────────────────

// Content gate: film must have at least a oneliner or plot to surface in curated lists
const CONTENT_GATE = `(oneliner IS NOT NULL AND oneliner != '' OR plot IS NOT NULL AND plot != '')`;

export function getFilmsByStatus(status: string, limit = 8): Film[] {
  return getDb()
    .prepare(`SELECT ${FILM_SELECT_PLAIN} FROM films WHERE status = ? AND ${CONTENT_GATE} ORDER BY rating DESC LIMIT ?`)
    .all(status, limit) as Film[];
}

export function getTopFilms(limit = 50): Film[] {
  return getDb()
    .prepare(
      `SELECT ${FILM_SELECT_PLAIN} FROM films
       WHERE rating IS NOT NULL AND rating > 0 AND ${CONTENT_GATE}
       ORDER BY rating DESC LIMIT ?`
    )
    .all(limit) as Film[];
}

export function getFilmBySlug(slug: string): Film | null {
  return (
    getDb()
      .prepare(`SELECT ${FILM_SELECT_PLAIN} FROM films WHERE slug = ?`)
      .get(slug) as Film | undefined
  ) ?? null;
}

export function getAllFilms(
  opts: {
    decade?: number;
    minRating?: number;
    sort?: "rating" | "year" | "title";
    page?: number;
    pageSize?: number;
    badge?: string;
    status?: FilmStatus | string;
  } = {}
): { films: Film[]; total: number } {
  const { decade, minRating, sort = "rating", page = 1, pageSize = 24, badge, status } = opts;

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (decade) {
    conditions.push("year >= ? AND year < ?");
    params.push(decade, decade + 10);
  }
  if (minRating !== undefined) {
    conditions.push("rating >= ?");
    params.push(minRating);
  }
  if (badge) {
    conditions.push("badges LIKE ?");
    params.push(`%${badge}%`);
  }
  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
  const orderMap = { rating: "rating DESC", year: "year DESC", title: "title ASC" };
  const order = orderMap[sort] ?? "rating DESC";
  const offset = (page - 1) * pageSize;

  const total = (
    getDb()
      .prepare(`SELECT COUNT(*) as cnt FROM films ${where}`)
      .get(...params) as { cnt: number }
  ).cnt;

  const films = getDb()
    .prepare(`SELECT ${FILM_SELECT_PLAIN} FROM films ${where} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .all(...params, pageSize, offset) as Film[];

  return { films, total };
}

export function getSimilarFilms(filmId: number, year: number | null, rating: number | null, limit = 6): Film[] {
  const decadeStart = year ? Math.floor(year / 10) * 10 : null;
  const ratingMin = rating ? Math.max(0, rating - 20) : null;
  const ratingMax = rating ? Math.min(100, rating + 20) : null;

  if (!decadeStart || ratingMin === null) {
    return getDb()
      .prepare(`SELECT ${FILM_SELECT_PLAIN} FROM films WHERE id != ? AND rating IS NOT NULL AND ${CONTENT_GATE} ORDER BY rating DESC LIMIT ?`)
      .all(filmId, limit) as Film[];
  }

  const results = getDb()
    .prepare(
      `SELECT ${FILM_SELECT_PLAIN} FROM films
       WHERE id != ? AND year >= ? AND year < ?
         AND rating >= ? AND rating <= ? AND ${CONTENT_GATE}
       ORDER BY rating DESC LIMIT ?`
    )
    .all(filmId, decadeStart, decadeStart + 10, ratingMin, ratingMax, limit) as Film[];

  // Fall back to top-rated with content if not enough same-decade results
  if (results.length < limit) {
    return getDb()
      .prepare(`SELECT ${FILM_SELECT_PLAIN} FROM films WHERE id != ? AND rating IS NOT NULL AND ${CONTENT_GATE} ORDER BY rating DESC LIMIT ?`)
      .all(filmId, limit) as Film[];
  }
  return results;
}

export function searchFilms(query: string, limit = 10): Film[] {
  const like = `%${query}%`;
  return getDb()
    .prepare(
      `SELECT id, old_id as oldId, title, year, slug, rating, votes,
              stars, badges, poster_src as posterSrc, backdrop_src as backdropSrc, status,
              null as plot, null as oneliner, null as summary, null as trailer,
              null as writers, null as musicDirectors, null as wikiHandle,
              null as tmdbId
       FROM films WHERE title LIKE ? ORDER BY votes DESC LIMIT ?`
    )
    .all(like, limit) as Film[];
}

// ── Cast / People queries ─────────────────────────────────────────────────────

export function getCastForFilm(filmId: number): CastMember[] {
  return getDb()
    .prepare(
      `SELECT p.id as personId, p.name, p.slug, p.image_url as imageUrl,
              fp.role, fp.character
       FROM film_people fp
       JOIN people p ON fp.person_id = p.id
       WHERE fp.film_id = ?
       ORDER BY CASE fp.role WHEN 'director' THEN 0 ELSE 1 END, fp.id ASC`
    )
    .all(filmId) as CastMember[];
}

export function getPersonBySlug(slug: string): Person | null {
  return (
    getDb()
      .prepare(
        `SELECT id, name, slug, image_url as imageUrl, bio, type, birthdate, birthplace
         FROM people WHERE slug = ?`
      )
      .get(slug) as Person | undefined
  ) ?? null;
}

export function getFilmographyForPerson(personId: number, limit = 60): (Film & { role: string; character: string | null })[] {
  return getDb()
    .prepare(
      `SELECT ${FILM_SELECT}, fp.role, fp.character
       FROM film_people fp
       JOIN films f ON fp.film_id = f.id
       WHERE fp.person_id = ?
       ORDER BY f.year DESC, f.rating DESC
       LIMIT ?`
    )
    .all(personId, limit) as (Film & { role: string; character: string | null })[];
}

export function getTopPeople(type: "actor" | "director", limit = 20): (Person & { filmCount: number })[] {
  return getDb()
    .prepare(
      `SELECT p.id, p.name, p.slug, p.image_url as imageUrl, p.bio, p.type,
              p.birthdate, p.birthplace, COUNT(fp.id) as filmCount
       FROM people p
       JOIN film_people fp ON p.id = fp.person_id
       WHERE p.type = ?
       GROUP BY p.id
       ORDER BY filmCount DESC
       LIMIT ?`
    )
    .all(type, limit) as (Person & { filmCount: number })[];
}

/** Fetch a curated list of people by slug, preserving the provided order. */
export function getCuratedPeople(slugs: string[]): (Person & { filmCount: number })[] {
  if (slugs.length === 0) return [];
  const db = getDb();
  const placeholders = slugs.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `SELECT p.id, p.name, p.slug, p.image_url as imageUrl, p.bio, p.type,
              p.birthdate, p.birthplace, COUNT(fp.id) as filmCount
       FROM people p
       LEFT JOIN film_people fp ON p.id = fp.person_id
       WHERE p.slug IN (${placeholders})
       GROUP BY p.id`
    )
    .all(...slugs) as (Person & { filmCount: number })[];
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return slugs
    .map((s) => bySlug.get(s))
    .filter((p): p is Person & { filmCount: number } => p !== undefined);
}

// ── Review queries ────────────────────────────────────────────────────────────

export function getReviewsForFilm(filmId: number, limit = 20): Review[] {
  return getDb()
    .prepare(
      `SELECT id, film_id as filmId, reviewer, source_name as sourceName,
              source_link as sourceLink, rating, excerpt
       FROM reviews WHERE film_id = ? ORDER BY rating DESC LIMIT ?`
    )
    .all(filmId, limit) as Review[];
}

// ── Article queries ───────────────────────────────────────────────────────────

const ARTICLE_SELECT = `
  a.id, a.title, a.slug, a.description, a.content, a.thumbnail, a.celebrity,
  a.is_spotlight as isSpotlight, a.created_at as createdAt,
  a.film_id as filmId, f.title as filmTitle, f.slug as filmSlug
`;

export function getLatestArticles(page = 1, limit = 15): Article[] {
  const offset = (page - 1) * limit;
  return getDb()
    .prepare(
      `SELECT ${ARTICLE_SELECT} FROM articles a
       LEFT JOIN films f ON a.film_id = f.id
       ORDER BY a.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as Article[];
}

export function getSpotlightArticles(page = 1, limit = 12): Article[] {
  const offset = (page - 1) * limit;
  return getDb()
    .prepare(
      `SELECT ${ARTICLE_SELECT} FROM articles a
       LEFT JOIN films f ON a.film_id = f.id
       WHERE a.is_spotlight = 1
       ORDER BY a.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as Article[];
}

// ── Song queries ──────────────────────────────────────────────────────────────

export interface SongWithFilm extends Song {
  filmTitle: string;
  filmSlug: string;
}

export function getSongsForFilm(filmId: number, limit = 10): Song[] {
  return getDb()
    .prepare(
      `SELECT id, film_id as filmId, title, youtube_id as youtubeId, category
       FROM songs WHERE film_id = ? AND youtube_id != '' LIMIT ?`
    )
    .all(filmId, limit) as Song[];
}

export function getSongsByCategory(
  category: string,
  opts: { page?: number; pageSize?: number } = {}
): { songs: SongWithFilm[]; total: number } {
  const { page = 1, pageSize = 24 } = opts;
  const offset = (page - 1) * pageSize;

  // Tags are comma-separated; match exact tag using sentinel wrapping
  const total = (
    getDb()
      .prepare(
        `SELECT COUNT(*) as cnt FROM songs
         WHERE (',' || category || ',') LIKE '%,' || ? || ',%'
           AND youtube_id IS NOT NULL AND youtube_id != ''`
      )
      .get(category) as { cnt: number }
  ).cnt;

  const songs = getDb()
    .prepare(
      `SELECT s.id, s.film_id as filmId, s.title, s.youtube_id as youtubeId,
              s.category, f.title as filmTitle, f.slug as filmSlug
       FROM songs s
       JOIN films f ON s.film_id = f.id
       WHERE (',' || s.category || ',') LIKE '%,' || ? || ',%'
         AND s.youtube_id IS NOT NULL AND s.youtube_id != ''
       ORDER BY s.id LIMIT ? OFFSET ?`
    )
    .all(category, pageSize, offset) as SongWithFilm[];

  return { songs, total };
}

export function getSongCategories(): { category: string; count: number }[] {
  // Tags are comma-separated — split and count each individually
  const rows = getDb()
    .prepare(
      `SELECT category FROM songs
       WHERE category IS NOT NULL AND category != ''
         AND youtube_id IS NOT NULL AND youtube_id != ''`
    )
    .all() as { category: string }[];

  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const tag of row.category.split(",").map((t) => t.trim()).filter(Boolean)) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));
}


export function getFeaturedSongs(limit = 4): SongWithFilm[] {
  return getDb()
    .prepare(
      `SELECT s.id, s.film_id as filmId, s.title, s.youtube_id as youtubeId,
              s.category, f.title as filmTitle, f.slug as filmSlug
       FROM songs s JOIN films f ON s.film_id = f.id
       WHERE s.youtube_id IS NOT NULL AND s.youtube_id != ''
         AND s.category IS NOT NULL AND s.category != ''
       ORDER BY RANDOM() LIMIT ?`
    )
    .all(limit) as SongWithFilm[];
}

// ── Homepage helpers ───────────────────────────────────────────────────────────

export function getHeroFilm(): Film | null {
  return (
    getDb()
      .prepare(
        `SELECT ${FILM_SELECT_PLAIN} FROM films
         WHERE rating >= 80 AND year >= 1990 AND year <= 2005 AND ${CONTENT_GATE}
         ORDER BY RANDOM() LIMIT 1`
      )
      .get() as Film | undefined
  ) ?? null;
}

export function getFilmsByDecade(decade: number, limit = 12): Film[] {
  return getDb()
    .prepare(
      `SELECT ${FILM_SELECT_PLAIN} FROM films
       WHERE year >= ? AND year < ? AND rating IS NOT NULL AND rating > 0 AND ${CONTENT_GATE}
       ORDER BY rating DESC LIMIT ?`
    )
    .all(decade, decade + 10, limit) as Film[];
}

export function getVibeStats(): VibeStat[] {
  const rows = getDb()
    .prepare(
      `SELECT badges, poster_src as posterSrc FROM films
       WHERE badges IS NOT NULL AND badges != ''`
    )
    .all() as { badges: string; posterSrc: string | null }[];

  const counts: Record<string, number> = {};
  const posters: Record<string, string | null> = {};

  for (const row of rows) {
    const tags = row.badges.split(",").map((t) => t.trim()).filter(Boolean);
    for (const tag of tags) {
      counts[tag] = (counts[tag] || 0) + 1;
      if (!posters[tag] && row.posterSrc) {
        posters[tag] = row.posterSrc;
      }
    }
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([badge, count]) => ({ badge, count, posterSrc: posters[badge] ?? null }));
}
