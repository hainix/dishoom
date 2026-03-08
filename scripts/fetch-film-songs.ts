/**
 * fetch-film-songs.ts
 *
 * Fetches definitive song tracklists from Apple iTunes/Music (free, no auth)
 * and inserts them into the songs table. Then searches YouTube for video IDs.
 *
 * Sources:
 *   Primary:  Apple iTunes Search API — comprehensive Bollywood catalog
 *   Fallback: MusicBrainz API — open music encyclopedia, good for classics
 *
 * Usage:
 *   npx tsx scripts/fetch-film-songs.ts                         # all films with few/no songs
 *   npx tsx scripts/fetch-film-songs.ts --film=chhaava-2025     # specific film
 *   npx tsx scripts/fetch-film-songs.ts --status=streaming      # all streaming films
 *   npx tsx scripts/fetch-film-songs.ts --min-rating=70         # high-rated classics
 *   npx tsx scripts/fetch-film-songs.ts --no-youtube            # skip YouTube step
 *
 * After this script: run `npx tsx scripts/fetch-youtube-ids.ts` to fill any
 * remaining gaps (it handles songs the YouTube step here might have missed).
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// ── Env ──────────────────────────────────────────────────────────────────────

const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const [k, ...rest] = line.split("=");
    if (k && rest.length) process.env[k.trim()] = rest.join("=").trim();
  }
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY ?? null;

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const filmSlug      = args.find(a => a.startsWith("--film="))?.split("=")[1] ?? null;
const statusFilter  = args.find(a => a.startsWith("--status="))?.split("=")[1] ?? null;
const minRatingArg  = args.find(a => a.startsWith("--min-rating="))?.split("=")[1];
const minRating     = minRatingArg ? parseInt(minRatingArg) : null;
const skipYoutube   = args.includes("--no-youtube");
const limitArg      = args.find(a => a.startsWith("--limit="))?.split("=")[1];
const LIMIT         = limitArg ? parseInt(limitArg) : 200;

// ── DB ────────────────────────────────────────────────────────────────────────

const db = new Database(path.resolve(__dirname, "../prisma/dev.db"));
db.pragma("journal_mode = WAL");

interface FilmRow {
  id: number;
  title: string;
  year: number | null;
  slug: string;
  tmdbId: number | null;
  songCount: number;
}

// Build film query
function getTargetFilms(): FilmRow[] {
  if (filmSlug) {
    return db.prepare(`
      SELECT f.id, f.title, f.year, f.slug, f.tmdb_id as tmdbId,
             COUNT(s.id) as songCount
      FROM films f
      LEFT JOIN songs s ON s.film_id = f.id
      WHERE f.slug = ?
      GROUP BY f.id
    `).all(filmSlug) as FilmRow[];
  }

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (statusFilter) {
    conditions.push("f.status = ?");
    params.push(statusFilter);
  }
  if (minRating !== null) {
    conditions.push("f.rating >= ?");
    params.push(minRating);
  }

  const where = conditions.length
    ? "WHERE " + conditions.join(" AND ")
    : "WHERE f.rating >= 60"; // default: only fetch songs for films worth watching

  return db.prepare(`
    SELECT f.id, f.title, f.year, f.slug, f.tmdb_id as tmdbId,
           COUNT(s.id) as songCount
    FROM films f
    LEFT JOIN songs s ON s.film_id = f.id
    ${where}
    GROUP BY f.id
    HAVING COUNT(s.id) < 3
    ORDER BY f.rating DESC, f.year DESC
    LIMIT ?
  `).all(...params, LIMIT) as FilmRow[];
}

// ── iTunes API ────────────────────────────────────────────────────────────────

interface ItunesAlbum {
  collectionId: number;
  collectionName: string;
  artistName: string;
  releaseDate: string;
  primaryGenreName?: string;
  trackCount?: number;
}

interface ItunesTrack {
  wrapperType: string;
  kind?: string;
  trackName?: string;
  trackNumber?: number;
  artistName?: string;
}

const STOP_WORDS = new Set(["the", "a", "an", "and", "or", "of", "in", "is", "to", "2", "part"]);

/** Normalize a title for fuzzy comparison: lowercase, strip punctuation, split words */
function normalizeWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w && !STOP_WORDS.has(w));
}

/**
 * Score how well `albumName` matches `filmTitle`.
 *
 * Rules:
 * 1. The album name must START with the film's title words (lead score).
 *    "Chhaava (Original Motion Picture Soundtrack)" → leads with "chhaava" ✓
 *    "CONTRACT KILL (2024 sample drill)" vs "Kill" → lead word is "contract" ✗
 * 2. We also reward total word overlap, but lead score dominates.
 * 3. Short film titles (1-2 words) get a stricter leading match requirement.
 */
function titleMatchScore(filmTitle: string, albumName: string): number {
  const filmWords = normalizeWords(filmTitle);
  const albumWords = normalizeWords(albumName);
  if (filmWords.length === 0) return 0;

  // Count how many film words appear at the START of album words
  let leadMatch = 0;
  for (let i = 0; i < filmWords.length && i < albumWords.length; i++) {
    if (filmWords[i] === albumWords[i]) leadMatch++;
    else break;
  }

  // Total word overlap (unordered)
  const filmSet = new Set(filmWords);
  const totalOverlap = albumWords.filter(w => filmSet.has(w)).length;

  const leadScore = leadMatch / filmWords.length;
  const totalScore = totalOverlap / filmWords.length;

  // Lead score dominates (0.7 weight). For single-word titles this is critical.
  return leadScore * 0.7 + totalScore * 0.3;
}

/**
 * Search iTunes for a Bollywood film's soundtrack album.
 * Tries: (title + year) → (title alone) for resilience.
 * Prefers: official soundtracks > Bollywood genre > full albums > singles.
 */
async function findItunesAlbum(
  title: string,
  year: number | null
): Promise<ItunesAlbum | null> {
  const terms = year ? [`${title} ${year}`, title] : [title];

  for (const term of terms) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=album&country=in&limit=15`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "DishoomFilms/1.0" } });
      if (!res.ok) continue;

      const data = await res.json() as { results: ItunesAlbum[] };
      if (!data.results?.length) continue;

      const candidates = data.results
        .map(a => ({
          album: a,
          score: titleMatchScore(title, a.collectionName),
          isSoundtrack: /original.*picture.*soundtrack|original.*soundtrack|\bost\b/i.test(a.collectionName),
          isBollywood: /bollywood|hindi/i.test(a.primaryGenreName ?? ""),
          isFullAlbum: (a.trackCount ?? 1) >= 3,
          releaseYear: a.releaseDate ? parseInt(a.releaseDate.slice(0, 4)) : null,
        }))
        // Core requirement: album name must begin with the film title
        .filter(c => c.score >= 0.65)
        // Must be identifiably Bollywood/Hindi or an official soundtrack
        .filter(c => c.isSoundtrack || c.isBollywood)
        // If film year known, album must be within ±2 years
        .filter(c => !year || !c.releaseYear || Math.abs(c.releaseYear - year) <= 2);

      if (!candidates.length) continue;

      // Sort priority: official soundtrack > Bollywood genre > full album > score
      candidates.sort((a, b) => {
        if (a.isSoundtrack !== b.isSoundtrack) return a.isSoundtrack ? -1 : 1;
        if (a.isBollywood !== b.isBollywood) return a.isBollywood ? -1 : 1;
        if (a.isFullAlbum !== b.isFullAlbum) return a.isFullAlbum ? -1 : 1;
        return b.score - a.score;
      });

      return candidates[0].album;
    } catch {
      // network error — try next term
    }
    await new Promise(r => setTimeout(r, 400)); // polite pause between retries
  }

  return null;
}

async function getItunesTracks(albumId: number): Promise<string[]> {
  const url = `https://itunes.apple.com/lookup?id=${albumId}&entity=song`;
  const res = await fetch(url, { headers: { "User-Agent": "DishoomFilms/1.0" } });
  if (!res.ok) return [];

  const data = await res.json() as { results: ItunesTrack[] };
  return data.results
    .filter(r => r.wrapperType === "track" && r.kind === "song" && r.trackName)
    .sort((a, b) => (a.trackNumber ?? 99) - (b.trackNumber ?? 99))
    .map(r => r.trackName!.trim());
}

// ── MusicBrainz fallback ──────────────────────────────────────────────────────

interface MBRelease {
  id: string;
  title: string;
  date?: string;
}

interface MBTrack {
  title: string;
  number: string;
}

async function findMusicBrainzTracks(title: string, year: number | null): Promise<string[]> {
  await new Promise(r => setTimeout(r, 1000)); // MusicBrainz rate limit: 1 req/sec

  const query = encodeURIComponent(`release:"${title}" AND country:IN`);
  const searchUrl = `https://musicbrainz.org/ws/2/release/?query=${query}&limit=5&fmt=json`;
  const res = await fetch(searchUrl, {
    headers: { "User-Agent": "DishoomFilms/1.0 (contact@dishoomfilms.com)" },
  });
  if (!res.ok) return [];

  const data = await res.json() as { releases: MBRelease[] };
  if (!data.releases?.length) return [];

  // Pick closest year match
  const scored = data.releases
    .map(r => ({
      r,
      score: titleMatchScore(title, r.title),
      yearDiff: year && r.date ? Math.abs(parseInt(r.date.slice(0, 4)) - year) : 99,
    }))
    .filter(x => x.score >= 0.6)
    .sort((a, b) => a.yearDiff - b.yearDiff || b.score - a.score);

  if (!scored.length) return [];
  const releaseId = scored[0].r.id;

  await new Promise(r => setTimeout(r, 1000));
  const trackUrl = `https://musicbrainz.org/ws/2/release/${releaseId}?inc=recordings&fmt=json`;
  const tRes = await fetch(trackUrl, {
    headers: { "User-Agent": "DishoomFilms/1.0 (contact@dishoomfilms.com)" },
  });
  if (!tRes.ok) return [];

  const tData = await tRes.json() as {
    media?: { tracks: MBTrack[] }[];
  };

  return (tData.media ?? [])
    .flatMap(m => m.tracks ?? [])
    .map(t => t.title?.trim())
    .filter(Boolean) as string[];
}

// ── YouTube search ────────────────────────────────────────────────────────────

const PREFERRED_CHANNELS = new Set([
  "UCq-Fj5jknLsUf-MWSy4_brA", // T-Series
  "UCLK_BkHm0YTMVHFqPCHSAhg", // Sony Music India
  "UCRvm6_bE6v0CSnOlFMVpBoQ", // Zee Music Company
  "UCJrDMFOdv1I2k8n9oK_V21w", // Tips Official
]);

async function checkEmbeddable(ids: string[]): Promise<Set<string>> {
  if (!YOUTUBE_API_KEY) {
    // Fallback: oEmbed check
    const embeddable = new Set<string>();
    for (const id of ids) {
      try {
        const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
        if (r.ok) embeddable.add(id);
      } catch { embeddable.add(id); }
      await new Promise(r => setTimeout(r, 80));
    }
    return embeddable;
  }

  const url = `https://www.googleapis.com/youtube/v3/videos?part=status&id=${ids.join(",")}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return new Set(ids); // assume embeddable on error
  const data = await res.json() as {
    items?: { id: string; status: { embeddable: boolean; privacyStatus: string } }[];
  };
  return new Set(
    (data.items ?? [])
      .filter(i => i.status?.embeddable && i.status?.privacyStatus === "public")
      .map(i => i.id)
  );
}

async function searchYouTube(songTitle: string, filmTitle: string): Promise<string | null> {
  if (!YOUTUBE_API_KEY) return null;

  const query = `${songTitle} ${filmTitle} official`;
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("videoCategoryId", "10");
  url.searchParams.set("maxResults", "8");
  url.searchParams.set("key", YOUTUBE_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const data = await res.json() as {
    items: { id: { videoId: string }; snippet: { channelId: string } }[];
  };
  if (!data.items?.length) return null;

  const ids = data.items.map(i => i.id.videoId);
  const embeddable = await checkEmbeddable(ids);
  if (!embeddable.size) return null;

  const preferred = data.items.find(
    i => PREFERRED_CHANNELS.has(i.snippet.channelId) && embeddable.has(i.id.videoId)
  );
  const any = data.items.find(i => embeddable.has(i.id.videoId));
  return (preferred ?? any)?.id.videoId ?? null;
}

// ── DB helpers ────────────────────────────────────────────────────────────────

const insertSong = db.prepare(
  `INSERT OR IGNORE INTO songs (film_id, title, youtube_id, category)
   VALUES (?, ?, NULL, NULL)`
);
const updateYouTube = db.prepare(
  `UPDATE songs SET youtube_id = ? WHERE id = ?`
);
const getSongId = db.prepare(
  `SELECT id FROM songs WHERE film_id = ? AND lower(title) = lower(?)`
);

// ── Main ──────────────────────────────────────────────────────────────────────

async function processFilm(film: FilmRow): Promise<number> {
  console.log(`\n📀  ${film.title} (${film.year ?? "?"}) — existing songs: ${film.songCount}`);

  let tracks: string[] = [];

  // ── Try iTunes first ──
  const album = await findItunesAlbum(film.title, film.year);
  if (album) {
    console.log(`   iTunes album: "${album.collectionName}" by ${album.artistName}`);
    tracks = await getItunesTracks(album.collectionId);
    console.log(`   Found ${tracks.length} tracks via iTunes`);
  }

  // ── MusicBrainz fallback ──
  if (tracks.length === 0) {
    console.log(`   No iTunes match — trying MusicBrainz…`);
    tracks = await findMusicBrainzTracks(film.title, film.year);
    if (tracks.length > 0) {
      console.log(`   Found ${tracks.length} tracks via MusicBrainz`);
    } else {
      console.log(`   ✗  No tracklist found for ${film.title}`);
      return 0;
    }
  }

  // ── Insert songs ──
  let inserted = 0;
  db.transaction(() => {
    for (const title of tracks) {
      const r = insertSong.run(film.id, title);
      if (r.changes > 0) inserted++;
    }
  })();
  console.log(`   Inserted ${inserted} new songs (${tracks.length - inserted} already existed)`);

  // ── Optional YouTube search ──
  if (!skipYoutube && YOUTUBE_API_KEY) {
    const songsNeedingYT = db.prepare(`
      SELECT id, title FROM songs
      WHERE film_id = ? AND (youtube_id IS NULL OR youtube_id = '') AND title IS NOT NULL
      ORDER BY id ASC
    `).all(film.id) as { id: number; title: string }[];

    let found = 0;
    for (const song of songsNeedingYT) {
      const ytId = await searchYouTube(song.title, film.title);
      if (ytId) {
        updateYouTube.run(ytId, song.id);
        found++;
        console.log(`   ✓  ${song.title} → ${ytId}`);
      } else {
        console.log(`   ✗  ${song.title} (no YouTube result)`);
      }
      await new Promise(r => setTimeout(r, 250)); // YouTube quota care
    }
    console.log(`   YouTube: ${found}/${songsNeedingYT.length} matched`);
  } else if (!YOUTUBE_API_KEY && !skipYoutube) {
    console.log(`   ℹ️  No YOUTUBE_API_KEY — skipping YouTube. Run fetch-youtube-ids.ts separately.`);
  }

  return inserted;
}

async function main() {
  const films = getTargetFilms();

  if (films.length === 0) {
    console.log("No matching films found. Check your --film, --status, or --min-rating args.");
    db.close();
    return;
  }

  console.log(`Processing ${films.length} film(s)…`);
  if (!YOUTUBE_API_KEY && !skipYoutube) {
    console.log(`ℹ️  Set YOUTUBE_API_KEY in .env.local to also fetch YouTube IDs in one pass.`);
  }

  let totalInserted = 0;
  for (const film of films) {
    totalInserted += await processFilm(film);
    await new Promise(r => setTimeout(r, 500)); // polite pause between films
  }

  const totalWithYT = (db.prepare(`
    SELECT COUNT(*) as c FROM songs WHERE youtube_id IS NOT NULL AND youtube_id != ''
  `).get() as { c: number }).c;

  console.log(`\n✅  Done. Inserted ${totalInserted} new songs total.`);
  console.log(`   Songs with YouTube IDs in DB: ${totalWithYT.toLocaleString()}`);
  console.log(`\nNext: YOUTUBE_API_KEY=<key> npx tsx scripts/fetch-youtube-ids.ts --limit=500`);

  db.close();
}

main().catch(err => { console.error(err); process.exit(1); });
