/**
 * Songs cron — three responsibilities run daily:
 *
 * 1. EMBED AUDIT  — batch-check all existing youtube_ids via oEmbed (no quota).
 *    Blocked/deleted videos are re-searched for an embeddable alternative; if
 *    none found they are nulled so the watch page never shows a broken player.
 *
 * 2. NEW FILM SONGS — for films inserted in the last 7 days, fetch YouTube IDs
 *    and auto-tag with Claude.
 *
 * 3. BACKFILL — fill YouTube IDs for high-rated older films that still have
 *    untagged songs, up to the remaining daily quota.
 *
 * YouTube quota budget (10,000 units/day):
 *   - Embed audit batch checks: ~3 units (50 IDs per request)
 *   - Re-search for blocked songs: ≤10 × 100 = 1,000 units
 *   - New film + backfill searches: ≤40 × 100 = 4,000 units
 *   Total: ~5,000 units — well within the free tier.
 */
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "../db";

const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY;

const PREFERRED_CHANNELS = new Set([
  "UCq-Fj5jknLsUf-MWSy4_brA", // T-Series
  "UCLK_BkHm0YTMVHFqPCHSAhg", // Sony Music India
  "UCRvm6_bE6v0CSnOlFMVpBoQ", // Zee Music Company
  "UCJrDMFOdv1I2k8n9oK_V21w", // Tips Official
  "UC6TE96JlxaqiAIHJOuHWNZA", // Speed Records
  "UCNUYwRhZBo5O48SJLb5j0Ug", // YRF
]);

const TAG_VOCABULARY = [
  "qawwali", "ghazal", "mujra", "bhajan", "folk", "classical", "sufi", "item-number",
  "instrumental", "fusion",
  "romantic", "heartbreak", "tear-jerker", "philosophical", "defiant", "bittersweet",
  "melancholy", "euphoric", "soulful", "playful",
  "anthem", "earworm", "dance-floor", "campfire", "slow-burn", "singalong",
  "friendship", "monsoon", "rain-romance", "holi", "wedding", "patriotic", "devotional",
  "village-life", "coming-of-age", "road-trip", "college", "maternal-love",
  "mughal-era", "british-india", "radha-krishna",
  "ar-rahman", "golden-age", "retro-70s", "bollywood-crossover", "iconic", "evergreen",
  "black-and-white", "lata-mangeshkar",
];

// ── Embeddability helpers ────────────────────────────────────────────────────

/**
 * Batch-check embeddability via YouTube Data API (videos?part=status).
 * Returns null if quota exceeded — caller should fall back to oEmbed.
 * Each call costs 1 unit and checks up to 50 IDs.
 */
async function checkEmbeddableBatch(ids: string[]): Promise<Set<string> | null> {
  if (!YOUTUBE_KEY) return null;
  const url = `https://www.googleapis.com/youtube/v3/videos?part=status&id=${ids.join(",")}&key=${YOUTUBE_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { reason?: string } };
    if (body?.error?.reason === "quotaExceeded") return null;
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
 * Check a single video via oEmbed GET. No API quota.
 * 200 = embeddable, 401 = embedding disabled, 404 = deleted/private.
 * Must use GET not HEAD — HEAD returns 200 even for blocked videos.
 */
async function isEmbeddableOembed(videoId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    return res.ok;
  } catch {
    return true; // network error → assume fine
  }
}

/** Returns the set of embeddable IDs. Falls back to per-video oEmbed on quota exhaustion. */
async function resolveEmbeddable(ids: string[]): Promise<Set<string>> {
  const batch = await checkEmbeddableBatch(ids);
  if (batch !== null) return batch;

  // Quota exceeded — fall back to oEmbed (no quota, sequential)
  const embeddable = new Set<string>();
  for (const id of ids) {
    if (await isEmbeddableOembed(id)) embeddable.add(id);
    await new Promise(r => setTimeout(r, 120));
  }
  return embeddable;
}

// ── YouTube search ───────────────────────────────────────────────────────────

/**
 * Search YouTube for a song and return the first EMBEDDABLE video ID.
 * Checks all results before committing so we never save a blocked ID.
 */
async function searchYouTube(query: string): Promise<string | null> {
  if (!YOUTUBE_KEY) return null;

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("videoCategoryId", "10");
  url.searchParams.set("maxResults", "8");
  url.searchParams.set("key", YOUTUBE_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const data = await res.json() as {
    items?: { id: { videoId: string }; snippet: { channelId: string } }[]
  };
  if (!data.items?.length) return null;

  const ids = data.items.map(i => i.id.videoId);
  const embeddable = await resolveEmbeddable(ids);
  if (!embeddable.size) return null;

  const preferred = data.items.find(
    i => PREFERRED_CHANNELS.has(i.snippet.channelId) && embeddable.has(i.id.videoId)
  );
  const any = data.items.find(i => embeddable.has(i.id.videoId));
  return (preferred ?? any)?.id.videoId ?? null;
}

// ── Song tagging ─────────────────────────────────────────────────────────────

async function autoTagSong(
  client: Anthropic,
  songTitle: string,
  filmTitle: string,
  filmYear: number | null
): Promise<string> {
  const prompt = `You are a Bollywood music expert. Choose 3-5 tags for this song from the vocabulary below.

Song: "${songTitle}"
Film: "${filmTitle}" (${filmYear ?? "recent"})

Tag vocabulary:
${TAG_VOCABULARY.join(", ")}

Respond with only a comma-separated list of tags, nothing else. Example: romantic,earworm,ar-rahman`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 80,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text.trim() : "";
  const valid = text
    .split(",")
    .map(t => t.trim().toLowerCase())
    .filter(t => TAG_VOCABULARY.includes(t));
  return valid.slice(0, 5).join(",");
}

// ── Embed audit ──────────────────────────────────────────────────────────────

/**
 * Scan all songs with youtube_ids, fix any that are no longer embeddable.
 * Tries to find an embeddable alternative via fresh search; nulls out if none found.
 */
async function runEmbedAudit(): Promise<{ blocked: number; replaced: number; nulled: number }> {
  const db = getDb();
  const songs = db.prepare(`
    SELECT s.id, s.title, s.youtube_id as youtubeId,
           f.title as filmTitle, f.year as filmYear
    FROM songs s
    JOIN films f ON s.film_id = f.id
    WHERE s.youtube_id IS NOT NULL AND s.youtube_id != ''
  `).all() as { id: number; title: string; youtubeId: string; filmTitle: string; filmYear: number | null }[];

  const update = db.prepare("UPDATE songs SET youtube_id = ? WHERE id = ?");
  let blocked = 0, replaced = 0, nulled = 0;

  const BATCH = 50;
  for (let i = 0; i < songs.length; i += BATCH) {
    const batch = songs.slice(i, i + BATCH);
    const embeddable = await resolveEmbeddable(batch.map(s => s.youtubeId));

    for (const song of batch) {
      if (embeddable.has(song.youtubeId)) continue;
      blocked++;

      const query = `${song.title} ${song.filmTitle} ${song.filmYear ?? ""} official audio`;
      const alt = await searchYouTube(query);

      if (alt && alt !== song.youtubeId) {
        update.run(alt, song.id);
        replaced++;
        console.log(`[cron:songs] embed fix: "${song.title}" → ${alt}`);
      } else {
        update.run(null, song.id);
        nulled++;
        console.log(`[cron:songs] embed null: "${song.title}" — ${song.filmTitle} (no embeddable alt)`);
      }
      await new Promise(r => setTimeout(r, 200));
    }

    if (i + BATCH < songs.length) await new Promise(r => setTimeout(r, 300));
  }

  return { blocked, replaced, nulled };
}

// ── Main cron ────────────────────────────────────────────────────────────────

export async function runSongsCron(): Promise<void> {
  const db = getDb();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // ── Step 1: Embed audit ──────────────────────────────────────────────────
  console.log("[cron:songs] running embed audit…");
  const audit = await runEmbedAudit();
  if (audit.blocked > 0) {
    console.log(`[cron:songs] embed audit: ${audit.blocked} blocked, ${audit.replaced} replaced, ${audit.nulled} nulled`);
  } else {
    console.log("[cron:songs] embed audit: all clean");
  }

  if (!YOUTUBE_KEY) {
    console.log("[cron:songs] YOUTUBE_API_KEY not set — skipping YouTube ID fetch");
    return;
  }

  const updateYoutubeId = db.prepare("UPDATE songs SET youtube_id = ? WHERE id = ?");
  const updateCategory = db.prepare("UPDATE songs SET category = ? WHERE id = ?");
  let ytFound = 0, tagged = 0;

  // ── Step 2: New film songs (last 7 days) — highest priority ─────────────
  const MAX_NEW = 20;
  const newFilms = db.prepare(`
    SELECT id, title, year FROM films
    WHERE created_at >= datetime('now', '-7 days')
  `).all() as { id: number; title: string; year: number | null }[];

  const newSongs: { id: number; title: string; filmTitle: string; filmYear: number | null }[] = [];
  for (const film of newFilms) {
    if (newSongs.length >= MAX_NEW) break;
    const songs = db.prepare(`
      SELECT id, title FROM songs
      WHERE film_id = ? AND (youtube_id IS NULL OR youtube_id = '')
        AND title IS NOT NULL AND title != ''
      LIMIT ?
    `).all(film.id, MAX_NEW - newSongs.length) as { id: number; title: string }[];
    for (const s of songs) newSongs.push({ id: s.id, title: s.title, filmTitle: film.title, filmYear: film.year });
  }

  // ── Step 3: Backfill — high-rated films with missing YouTube IDs ─────────
  const MAX_BACKFILL = 20;
  const backfillSongs = db.prepare(`
    SELECT s.id, s.title, f.title as filmTitle, f.year as filmYear
    FROM songs s
    JOIN films f ON s.film_id = f.id
    WHERE (s.youtube_id IS NULL OR s.youtube_id = '')
      AND s.title IS NOT NULL AND s.title != ''
      AND f.id NOT IN (
        SELECT DISTINCT f2.id FROM films f2
        WHERE f2.created_at >= datetime('now', '-7 days')
      )
    ORDER BY f.rating DESC NULLS LAST, f.votes DESC
    LIMIT ?
  `).all(MAX_BACKFILL) as { id: number; title: string; filmTitle: string; filmYear: number | null }[];

  const allToProcess = [
    ...newSongs,
    ...backfillSongs.filter(b => !newSongs.some(n => n.id === b.id)),
  ];

  if (allToProcess.length === 0) {
    console.log("[cron:songs] no songs to process");
    return;
  }

  console.log(`[cron:songs] processing ${newSongs.length} new-film songs + ${backfillSongs.length} backfill songs`);

  for (const song of allToProcess) {
    if (!song.title) continue;

    const videoId = await searchYouTube(`${song.title} ${song.filmTitle} official`);
    if (videoId) {
      updateYoutubeId.run(videoId, song.id);
      ytFound++;
    }
    await new Promise(r => setTimeout(r, 200));

    try {
      const tags = await autoTagSong(client, song.title, song.filmTitle, song.filmYear);
      if (tags) {
        updateCategory.run(tags, song.id);
        tagged++;
      }
    } catch (err) {
      console.error(`[cron:songs] tagging failed for "${song.title}":`, err);
    }

    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`[cron:songs] ${ytFound} YouTube IDs found, ${tagged} songs tagged`);
}
