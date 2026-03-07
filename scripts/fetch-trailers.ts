/**
 * Fetches official trailer YouTube IDs for films with no trailer set.
 * Prioritises by votes DESC (most popular films first).
 *
 * Usage: npx tsx scripts/fetch-trailers.ts [--limit=N]
 * Key loaded from .env.local YOUTUBE_API_KEY
 *
 * Quota: 100 units per search, 10,000 units/day free = 100 searches/day.
 * This script and fetch-youtube-ids.ts share the same daily quota —
 * the run-daily.sh wrapper splits the budget between them.
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Load .env.local
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
  console.error("❌  YOUTUBE_API_KEY not set in .env.local");
  process.exit(1);
}

const limitArg = process.argv.find(a => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1]) : 50;

const db = new Database(path.resolve(__dirname, "../prisma/dev.db"));
db.pragma("journal_mode = WAL");

interface FilmRow {
  id: number;
  title: string;
  year: number | null;
  votes: number;
}

const films = db.prepare(`
  SELECT id, title, year, votes FROM films
  WHERE (trailer IS NULL OR trailer = '')
    AND title IS NOT NULL AND title != ''
  ORDER BY votes DESC, rating DESC
  LIMIT ?
`).all(LIMIT) as FilmRow[];

console.log(`Searching trailers for ${films.length} films (limit ${LIMIT})…\n`);

const updateStmt = db.prepare("UPDATE films SET trailer = ? WHERE id = ?");

// Known official Bollywood / music channels — prefer these for trailers
const PREFERRED_CHANNELS = new Set([
  "UCNUYwRhZBo5O48SJLb5j0Ug", // Yash Raj Films
  "UCWOA1ZGywLbqmigxE4Qlvuw", // Dharma Productions
  "UCsFGnWMRMOBhQ-9OcpQ7MYA", // Eros Now
  "UCtn-a9k7DGsWyTW0tSdl5KA", // T-Series Films (trailers)
  "UCq-Fj5jknLsUf-MWSy4_brA", // T-Series
  "UCsFGnWMRMOBhQ-9OcpQ7MYA", // Eros Now
  "UC4O4UNLge8VUlhQ6g9Dkz3A", // Excel Entertainment
  "UCF0pVplsI8R5kcAqgtoRqoA", // Rajshri
  "UCGptrCAXDMuNsN5IZkB1WqA", // Fox Star Studios
  "UCuFqTT4W4JFRg9q5xYNFRdg", // Red Chillies
  "UC5iYnUMbs_MwgTMsRtxdJyg", // Tips Films
]);

async function searchTrailer(title: string, year: number | null): Promise<string | null> {
  const yearStr = year ? ` ${year}` : "";
  // Try Hindi trailer first, fall back to plain trailer search
  const queries = [
    `${title}${yearStr} official trailer`,
    `${title}${yearStr} trailer`,
  ];

  for (const query of queries) {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", query);
    url.searchParams.set("type", "video");
    url.searchParams.set("videoDuration", "short"); // trailers are <4 min
    url.searchParams.set("maxResults", "5");
    url.searchParams.set("key", API_KEY!);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err as any)?.error?.message ?? res.statusText;
      if (msg.includes("quota")) throw new Error("QUOTA_EXCEEDED");
      console.error("  API error:", msg);
      return null;
    }

    const data = await res.json() as {
      items: { id: { videoId: string }; snippet: { channelId: string; title: string } }[]
    };

    if (!data.items?.length) continue;

    // Prefer official channel results
    const preferred = data.items.find(item => PREFERRED_CHANNELS.has(item.snippet.channelId));
    return (preferred ?? data.items[0]).id.videoId;
  }

  return null;
}

async function main() {
  let found = 0;
  let failed = 0;

  for (const film of films) {
    try {
      const videoId = await searchTrailer(film.title, film.year);
      if (videoId) {
        updateStmt.run(videoId, film.id);
        found++;
        console.log(`✓  ${film.title} (${film.year}) → ${videoId}  [${film.votes} votes]`);
      } else {
        failed++;
        console.log(`✗  ${film.title} (${film.year}) — no result`);
      }
    } catch (err: any) {
      if (err.message === "QUOTA_EXCEEDED") {
        console.log("\n⚠️  Daily quota exceeded — stopping. Run again tomorrow.");
        break;
      }
      failed++;
      console.log(`✗  ${film.title} — error: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 250));
  }

  console.log(`\nDone: ${found} trailers found, ${failed} failed.`);

  const remaining = (db.prepare(`
    SELECT COUNT(*) as cnt FROM films
    WHERE (trailer IS NULL OR trailer = '') AND title IS NOT NULL
  `).get() as { cnt: number }).cnt;

  console.log(`Films still without trailer: ${remaining.toLocaleString()}`);
  db.close();
}

main().catch(err => { console.error(err); process.exit(1); });
