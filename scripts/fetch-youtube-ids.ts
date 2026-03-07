/**
 * Fetches real YouTube IDs for songs by searching the YouTube Data API v3.
 *
 * Usage:
 *   YOUTUBE_API_KEY=AIzaSy... npx tsx scripts/fetch-youtube-ids.ts
 *
 * Free quota: 10,000 units/day. Each search costs 100 units = 100 searches/day.
 * Run daily to fill the library. Pass --limit N to control how many per run.
 *
 * Strategy:
 *   1. Pick songs that have no youtube_id yet, from highest-rated films first
 *   2. Search YouTube for "{song title} {film title} official audio"
 *   3. Prefer results from known official channels (T-Series, Sony Music, etc.)
 *   4. Save the video ID back to the DB
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Load .env.local if YOUTUBE_API_KEY not already set
if (!process.env.YOUTUBE_API_KEY) {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const [k, ...rest] = line.split("=");
      if (k && rest.length) process.env[k.trim()] = rest.join("=").trim();
    }
  }
}

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error("❌  YOUTUBE_API_KEY not set. Add it to .env.local or pass inline.");
  process.exit(1);
}

const limitArg = process.argv.find(a => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1]) : 100;

const db = new Database(path.resolve(__dirname, "../prisma/dev.db"));
db.pragma("journal_mode = WAL");

// Official Bollywood music channels (prefer results from these)
const PREFERRED_CHANNELS = new Set([
  "UCq-Fj5jknLsUf-MWSy4_brA", // T-Series
  "UCLK_BkHm0YTMVHFqPCHSAhg", // Sony Music India
  "UCRvm6_bE6v0CSnOlFMVpBoQ", // Zee Music Company
  "UCJrDMFOdv1I2k8n9oK_V21w", // Tips Official
  "UC6TE96JlxaqiAIHJOuHWNZA", // Speed Records
  "UCNUYwRhZBo5O48SJLb5j0Ug", // YRF
]);

interface SongRow {
  id: number;
  title: string;
  filmTitle: string;
  filmYear: number | null;
  category: string | null;
}

const songs = db.prepare(`
  SELECT s.id, s.title, s.category, f.title as filmTitle, f.year as filmYear
  FROM songs s
  JOIN films f ON s.film_id = f.id
  WHERE (s.youtube_id IS NULL OR s.youtube_id = '')
    AND s.title IS NOT NULL AND s.title != ''
  ORDER BY f.rating DESC, f.votes DESC
  LIMIT ?
`).all(LIMIT) as SongRow[];

console.log(`Searching YouTube for ${songs.length} songs (limit ${LIMIT})…\n`);

const updateStmt = db.prepare("UPDATE songs SET youtube_id = ? WHERE id = ?");

async function searchYouTube(query: string): Promise<string | null> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("videoCategoryId", "10"); // Music category
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("key", API_KEY!);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("YouTube API error:", (err as any)?.error?.message ?? res.statusText);
    return null;
  }

  const data = await res.json() as {
    items: { id: { videoId: string }; snippet: { channelId: string; title: string } }[]
  };

  if (!data.items?.length) return null;

  // Prefer official channel results
  const preferred = data.items.find(item => PREFERRED_CHANNELS.has(item.snippet.channelId));
  return (preferred ?? data.items[0]).id.videoId;
}

async function main() {
  let found = 0;
  let failed = 0;

  for (const song of songs) {
    const query = `${song.title} ${song.filmTitle} official`;
    const videoId = await searchYouTube(query);

    if (videoId) {
      updateStmt.run(videoId, song.id);
      found++;
      console.log(`✓  ${song.title} — ${song.filmTitle} → ${videoId}`);
    } else {
      failed++;
      console.log(`✗  ${song.title} — ${song.filmTitle} (no result)`);
    }

    // Small delay to stay within rate limits
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nDone: ${found} found, ${failed} failed.`);

  const remaining = (db.prepare(`
    SELECT COUNT(*) as cnt FROM songs
    WHERE (youtube_id IS NULL OR youtube_id = '') AND title IS NOT NULL AND title != ''
  `).get() as { cnt: number }).cnt;

  console.log(`Songs still without YouTube ID: ${remaining.toLocaleString()}`);
  db.close();
}

main().catch(err => { console.error(err); process.exit(1); });
