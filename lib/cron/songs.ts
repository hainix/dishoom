/**
 * Songs cron: for new films (last 7 days), fetches YouTube IDs for untagged songs
 * and auto-tags them with Claude.
 *
 * Can also be run directly:
 *   npx tsx -e "import('./lib/cron/songs').then(m => m.runSongsCron())"
 */
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "../db";

const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY;
const MAX_SONGS = 20; // YouTube quota: 100 units/search × 20 = 2,000 units

// Official Bollywood music channels — prefer results from these
const PREFERRED_CHANNELS = new Set([
  "UCq-Fj5jknLsUf-MWSy4_brA", // T-Series
  "UCLK_BkHm0YTMVHFqPCHSAhg", // Sony Music India
  "UCRvm6_bE6v0CSnOlFMVpBoQ", // Zee Music Company
  "UCJrDMFOdv1I2k8n9oK_V21w", // Tips Official
  "UC6TE96JlxaqiAIHJOuHWNZA", // Speed Records
  "UCNUYwRhZBo5O48SJLb5j0Ug", // YRF
]);

// Full tag vocabulary (from tag-songs.ts)
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

async function searchYouTube(query: string): Promise<string | null> {
  if (!YOUTUBE_KEY) return null;
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("videoCategoryId", "10");
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("key", YOUTUBE_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const data = (await res.json()) as {
    items: { id: { videoId: string }; snippet: { channelId: string } }[];
  };
  if (!data.items?.length) return null;

  const preferred = data.items.find((item) => PREFERRED_CHANNELS.has(item.snippet.channelId));
  return (preferred ?? data.items[0]).id.videoId;
}

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
  // Validate: keep only tags in vocabulary
  const valid = text
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => TAG_VOCABULARY.includes(t));
  return valid.slice(0, 5).join(",");
}

export async function runSongsCron(): Promise<void> {
  const db = getDb();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Films inserted in the last 7 days
  const newFilms = db
    .prepare(
      `SELECT id, title, year FROM films
       WHERE created_at >= datetime('now', '-7 days')`
    )
    .all() as { id: number; title: string; year: number | null }[];

  if (newFilms.length === 0) {
    console.log("[cron:songs] no new films found");
    return;
  }

  // Collect songs without youtube_id from those films (cap at MAX_SONGS)
  const songsToProcess: { id: number; title: string; filmTitle: string; filmYear: number | null }[] = [];

  for (const film of newFilms) {
    if (songsToProcess.length >= MAX_SONGS) break;
    const songs = db
      .prepare(
        `SELECT id, title FROM songs
         WHERE film_id = ? AND (youtube_id IS NULL OR youtube_id = '')
           AND title IS NOT NULL AND title != ''
         LIMIT ?`
      )
      .all(film.id, MAX_SONGS - songsToProcess.length) as { id: number; title: string }[];
    for (const s of songs) {
      songsToProcess.push({ id: s.id, title: s.title, filmTitle: film.title, filmYear: film.year });
    }
  }

  if (songsToProcess.length === 0) {
    console.log("[cron:songs] no songs to process");
    return;
  }

  const updateYoutubeId = db.prepare("UPDATE songs SET youtube_id = ? WHERE id = ?");
  const updateCategory = db.prepare("UPDATE songs SET category = ? WHERE id = ?");

  let ytFound = 0;
  let tagged = 0;

  for (const song of songsToProcess) {
    // 1. Fetch YouTube ID
    if (!song.title) continue;
    const videoId = await searchYouTube(`${song.title} ${song.filmTitle} official`);
    if (videoId) {
      updateYoutubeId.run(videoId, song.id);
      ytFound++;
    }
    await new Promise((r) => setTimeout(r, 200));

    // 2. Auto-tag
    try {
      const tags = await autoTagSong(client, song.title, song.filmTitle, song.filmYear);
      if (tags) {
        updateCategory.run(tags, song.id);
        tagged++;
      }
    } catch (err) {
      console.error(`[cron:songs] tagging failed for "${song.title}":`, err);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`[cron:songs] ${ytFound} YouTube IDs found, ${tagged} songs tagged`);
}
