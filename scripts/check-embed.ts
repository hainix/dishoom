/**
 * Audits all songs with YouTube IDs — finds ones where embedding is disabled
 * and tries to swap them for an embeddable alternative via a fresh search.
 * Songs with no embeddable alternative get their youtube_id nulled out so
 * they don't appear on the watch page at all.
 *
 * API cost: ~1 unit per 50 songs to check (batch status) + ~100 units per
 * blocked song that needs a re-search. The 10k/day free quota is plenty.
 *
 * Usage:
 *   npx tsx scripts/check-embed.ts           # fix in DB
 *   npx tsx scripts/check-embed.ts --dry-run # report only, no DB writes
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
      if (k?.trim() && rest.length) process.env[k.trim()] = rest.join("=").trim();
    }
  }
}

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) { console.error("❌  YOUTUBE_API_KEY not set"); process.exit(1); }

const DRY_RUN = process.argv.includes("--dry-run");

const db = new Database(path.resolve(__dirname, "../prisma/dev.db"));
db.pragma("journal_mode = WAL");

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
  youtubeId: string;
  filmTitle: string;
  filmYear: number | null;
}

const songs = db.prepare(`
  SELECT s.id, s.title, s.youtube_id as youtubeId,
         f.title as filmTitle, f.year as filmYear
  FROM songs s
  JOIN films f ON s.film_id = f.id
  WHERE s.youtube_id IS NOT NULL AND s.youtube_id != ''
  ORDER BY f.rating DESC, f.votes DESC
`).all() as SongRow[];

console.log(`Checking ${songs.length} songs for embeddability…\n`);

/**
 * Check embeddability via YouTube Data API batch (videos?part=status).
 * Costs 1 unit per batch of up to 50. Returns null on quota/auth failure.
 */
async function checkEmbeddableBatch(ids: string[]): Promise<Set<string> | null> {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=status&id=${ids.join(",")}&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { reason?: string } };
    if (body?.error?.reason === "quotaExceeded") return null; // signal quota exhausted
    return new Set(ids); // other errors: fail open
  }
  const data = await res.json() as {
    items?: { id: string; status: { embeddable: boolean; privacyStatus: string } }[]
  };
  return new Set(
    (data.items ?? [])
      .filter(i => i.status?.embeddable && i.status?.privacyStatus === "public")
      .map(i => i.id)
  );
}

/**
 * oEmbed check — NO API quota. Returns true if embeddable.
 * 200 = embeddable, 401 = embedding disabled, 404 = not found/private.
 */
async function isEmbeddableOembed(videoId: string): Promise<boolean> {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  try {
    // Must use GET — HEAD returns 200 even for embedding-disabled videos
    const res = await fetch(url);
    return res.ok; // 200 = embeddable, 401 = embedding disabled, 404 = not found
  } catch {
    return true; // network error → assume fine, don't null out
  }
}

async function checkEmbeddable(ids: string[]): Promise<Set<string>> {
  // Try batch API first (fast, cheap)
  const batchResult = await checkEmbeddableBatch(ids);
  if (batchResult !== null) return batchResult;

  // Quota exceeded — fall back to oEmbed (no quota, one request per ID)
  console.log("  (Data API quota exceeded, using oEmbed fallback — slower but no quota)");
  const embeddable = new Set<string>();
  for (const id of ids) {
    if (await isEmbeddableOembed(id)) embeddable.add(id);
    await new Promise(r => setTimeout(r, 100));
  }
  return embeddable;
}

/**
 * Search YouTube for a song, return the first embeddable video ID.
 * Prefers official/label channels. Returns null if nothing embeddable found.
 */
async function findEmbeddable(song: SongRow): Promise<string | null> {
  const query = `${song.title} ${song.filmTitle} ${song.filmYear ?? ""} official audio`;
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("videoCategoryId", "10"); // Music
  searchUrl.searchParams.set("maxResults", "8");
  searchUrl.searchParams.set("key", API_KEY!);

  const res = await fetch(searchUrl.toString());
  if (!res.ok) return null;

  const data = await res.json() as {
    items?: { id: { videoId: string }; snippet: { channelId: string } }[]
  };
  if (!data.items?.length) return null;

  const ids = data.items.map(i => i.id.videoId);
  const embeddable = await checkEmbeddable(ids);
  if (!embeddable.size) return null;

  // Prefer official channels, then any embeddable result
  const preferred = data.items.find(
    i => PREFERRED_CHANNELS.has(i.snippet.channelId) && embeddable.has(i.id.videoId)
  );
  const any = data.items.find(i => embeddable.has(i.id.videoId));
  return (preferred ?? any)?.id.videoId ?? null;
}

async function main() {
  const update = db.prepare("UPDATE songs SET youtube_id = ? WHERE id = ?");
  let blocked = 0, replaced = 0, nulled = 0;

  const BATCH = 50;
  for (let i = 0; i < songs.length; i += BATCH) {
    const batch = songs.slice(i, i + BATCH);
    const embeddable = await checkEmbeddable(batch.map(s => s.youtubeId));

    const batchNum = `[batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(songs.length / BATCH)}]`;
    const blockedInBatch = batch.filter(s => !embeddable.has(s.youtubeId));

    if (blockedInBatch.length === 0) {
      console.log(`${batchNum} all ${batch.length} embeddable ✓`);
    } else {
      console.log(`${batchNum} ${blockedInBatch.length}/${batch.length} blocked — searching for alternatives…`);
    }

    for (const song of blockedInBatch) {
      blocked++;
      process.stdout.write(`  ✗ [${song.id}] "${song.title}" — ${song.filmTitle} (${song.youtubeId})`);

      const alt = await findEmbeddable(song);

      if (alt && alt !== song.youtubeId) {
        process.stdout.write(` → ${alt} ✓\n`);
        if (!DRY_RUN) update.run(alt, song.id);
        replaced++;
      } else {
        process.stdout.write(` → no embeddable alternative, nulled\n`);
        if (!DRY_RUN) update.run(null, song.id);
        nulled++;
      }

      await new Promise(r => setTimeout(r, 200));
    }

    // Small pause between batches
    if (i + BATCH < songs.length) await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Done${DRY_RUN ? " (dry run — no DB changes)" : ""}:`);
  console.log(`  ${blocked} videos with embedding disabled`);
  console.log(`  ${replaced} swapped for embeddable alternatives`);
  console.log(`  ${nulled} nulled out (no alternative found)`);
  console.log(`  ${songs.length - blocked} already fine`);
  db.close();
}

main().catch(err => { console.error(err); process.exit(1); });
