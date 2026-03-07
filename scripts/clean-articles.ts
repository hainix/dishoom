/**
 * Cleans up articles DB:
 *  1. Old articles (15-23): convert <br/> text → <p> HTML, upgrade w300 thumbnails → w780
 *  2. New articles (24-31): wrap \n\n-separated paragraphs in <p> tags
 *  3. Fetch missing thumbnails for IDs 27, 29, 30, 31 from TMDB / DB
 *
 * Run: npx tsx scripts/clean-articles.ts
 */

import Database from "better-sqlite3";
import path from "path";

const TMDB_KEY = "f8a0148b386a3f00558c847eb9e4284f";
const db = new Database(path.resolve(process.cwd(), "prisma/dev.db"));

// ── Text conversion helpers ───────────────────────────────────────────────────

/** Convert old <br/>/<br>-separated plain text into <p> HTML */
function brTextToHtml(text: string): string {
  // Already HTML — don't re-wrap
  if (/<p[\s>]/i.test(text)) return text;
  // Normalise <br /> variants then split on double-br
  const normalized = text
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/\r\n/g, "\n");
  const paras = normalized
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);
  return paras.map((p) => `<p>${p}</p>`).join("\n");
}

/** Convert \n\n-separated plain paragraphs into <p> HTML */
function plainTextToHtml(text: string): string {
  // If already has <p> tags, leave alone
  if (/<p[\s>]/i.test(text)) return text;
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return paras.map((p) => `<p>${p}</p>`).join("\n");
}

/** Upgrade TMDB image path size (w300, w185, w500 → w780) */
function upgradeThumbSize(url: string | null, newSize = "w780"): string | null {
  if (!url) return null;
  return url.replace(/\/p\/(w\d+|original)\//, `/p/${newSize}/`);
}

// ── TMDB search for Love & War ────────────────────────────────────────────────

async function fetchLoveWarThumb(): Promise<string | null> {
  // Search TMDB for Bhansali's Love & War (2026)
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=Love+%26+War&year=2026&language=en-US`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as { results: Array<{ backdrop_path: string | null; poster_path: string | null; title: string }> };
    // Pick Bhansali's film — look for a result with a backdrop
    const hit = data.results.find((r) => r.backdrop_path) ?? data.results[0];
    if (!hit) return null;
    if (hit.backdrop_path) return `https://image.tmdb.org/t/p/w780${hit.backdrop_path}`;
    if (hit.poster_path)  return `https://image.tmdb.org/t/p/w780${hit.poster_path}`;
    return null;
  } catch {
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const allArts = db.prepare("SELECT id, title, content, thumbnail FROM articles ORDER BY id").all() as Array<{
    id: number; title: string; content: string; thumbnail: string | null;
  }>;

  console.log(`\n=== Article Cleanup (${allArts.length} articles) ===\n`);

  // Missing thumbnails from DB
  const ramayanaBd  = "https://image.tmdb.org/t/p/w780/prbMZ3DPf8taS6JYQd6igPnm2mA.jpg";
  const deepikaImg  = "https://image.tmdb.org/t/p/w780/rzvvBQ0r6oiqDdzcsdTRB7jN4Rx.jpg";
  const dhurandharBd = "https://image.tmdb.org/t/p/w780/snYOXem8pUGOffnLbbGq4aB1pg4.jpg";

  // Love & War: try TMDB, fallback to a known still image
  console.log("Fetching Love & War thumbnail from TMDB...");
  const loveWarThumb = await fetchLoveWarThumb();
  console.log(`  → ${loveWarThumb ?? "not found, will skip"}`);

  const missingThumbs: Record<number, string | null> = {
    27: loveWarThumb,
    29: ramayanaBd,
    30: deepikaImg,
    31: dhurandharBd,
  };

  const updateContent  = db.prepare("UPDATE articles SET content = ? WHERE id = ?");
  const updateThumb    = db.prepare("UPDATE articles SET thumbnail = ? WHERE id = ?");
  const updateBoth     = db.prepare("UPDATE articles SET content = ?, thumbnail = ? WHERE id = ?");

  const runAll = db.transaction(() => {
    for (const art of allArts) {
      const isOld = art.id <= 23;
      const missingThumb = missingThumbs[art.id] ?? null;
      const needsThumb = missingThumb && !art.thumbnail;

      // ── Content conversion ─────────────────────────────────────────────────
      let newContent: string;
      if (isOld) {
        newContent = brTextToHtml(art.content.replace(/\\'/g, "'"));
      } else {
        newContent = plainTextToHtml(art.content);
      }

      // ── Thumbnail upgrade / fill ───────────────────────────────────────────
      let newThumb = art.thumbnail;
      if (isOld && art.thumbnail) {
        newThumb = upgradeThumbSize(art.thumbnail, "w780");
      } else if (needsThumb) {
        newThumb = missingThumb;
      }

      const contentChanged = newContent !== art.content;
      const thumbChanged   = newThumb !== art.thumbnail;

      if (contentChanged && thumbChanged && newThumb) {
        updateBoth.run(newContent, newThumb, art.id);
        console.log(`  [${art.id}] ${art.title.slice(0, 50)} — content+thumb`);
      } else if (contentChanged) {
        updateContent.run(newContent, art.id);
        console.log(`  [${art.id}] ${art.title.slice(0, 50)} — content`);
      } else if (thumbChanged && newThumb) {
        updateThumb.run(newThumb, art.id);
        console.log(`  [${art.id}] ${art.title.slice(0, 50)} — thumb`);
      } else {
        console.log(`  [${art.id}] ${art.title.slice(0, 50)} — ok`);
      }
    }
  });

  runAll();

  // ── Verify ─────────────────────────────────────────────────────────────────
  console.log("\n=== Verification ===");
  const check = db.prepare("SELECT id, title, thumbnail, substr(content,1,80) as preview FROM articles ORDER BY id").all() as Array<{
    id: number; title: string; thumbnail: string | null; preview: string;
  }>;
  for (const a of check) {
    const hasP = a.preview.includes("<p>");
    const hasThumb = !!a.thumbnail;
    console.log(`  [${a.id}] ${hasP ? "✓p" : "✗p"} ${hasThumb ? "✓thumb" : "✗thumb"} — ${a.title.slice(0, 45)}`);
  }

  db.close();
  console.log("\nDone.");
}

main().catch(console.error);
