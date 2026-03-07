/**
 * Fetches TMDB person profile photos for articles that have a celebrity field.
 * Also links articles to films where possible.
 *
 * Usage: npx tsx scripts/fetch-article-thumbnails.ts
 */

import Database from "better-sqlite3";
import path from "path";

const API_KEY = process.env.TMDB_API_KEY || "f8a0148b386a3f00558c847eb9e4284f";
const PROFILE_BASE = "https://image.tmdb.org/t/p/w300";

const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchPersonImage(name: string): Promise<string | null> {
  const params = new URLSearchParams({ api_key: API_KEY, query: name, language: "en-US" });
  const res = await fetch(`https://api.themoviedb.org/3/search/person?${params}`);
  if (!res.ok) return null;
  const data = await res.json() as { results: Array<{ profile_path: string | null }> };
  const first = data.results?.[0];
  return first?.profile_path ? `${PROFILE_BASE}${first.profile_path}` : null;
}

// Extract celebrity name from article title/celebrity field
const articles = db.prepare(
  "SELECT id, title, celebrity, thumbnail FROM articles"
).all() as { id: number; title: string; celebrity: string | null; thumbnail: string | null }[];

const updateThumb = db.prepare("UPDATE articles SET thumbnail = ? WHERE id = ?");

// Manual mapping of article titles → celebrity names
const titleCelebrityMap: Record<string, string> = {
  "Meet Mr. and Mrs. Bhupathi": "Lara Dutta",
  "A R Rahman loses BAFTA Award": "A.R. Rahman",
  "Saif opts out of Race 2?": "Saif Ali Khan",
  "Shilpa under threat!": "Shilpa Shetty",
  "Hrithik to make TV debut": "Hrithik Roshan",
  "Amitabh, Sonakshi joining Housefull 2": "Amitabh Bachchan",
  "Bipasha Basu wants to marry": "Bipasha Basu",
  "Akshay Kumar Signs Up": "Akshay Kumar",
  "Is Shahrukh Khan the worst actor": "Shah Rukh Khan",
};

async function main() {
  console.log(`Fetching thumbnails for ${articles.length} articles...\n`);

  for (const article of articles) {
    if (article.thumbnail) {
      console.log(`  ✓ [already has thumbnail] ${article.title.slice(0, 50)}`);
      continue;
    }

    // Determine celebrity to look up
    let celebName = article.celebrity;
    if (!celebName) {
      // Try manual map
      for (const [key, val] of Object.entries(titleCelebrityMap)) {
        if (article.title.includes(key.split(" ").slice(0, 3).join(" "))) {
          celebName = val;
          break;
        }
      }
    }

    if (!celebName) {
      console.log(`  ? [no celebrity] ${article.title.slice(0, 50)}`);
      continue;
    }

    const imageUrl = await fetchPersonImage(celebName);
    if (imageUrl) {
      updateThumb.run(imageUrl, article.id);
      console.log(`  ✓ ${celebName} → ${imageUrl.split("/").pop()}`);
    } else {
      console.log(`  ✗ ${celebName} (not found)`);
    }

    await sleep(300);
  }

  console.log("\nDone!");
  db.close();
}

main().catch(console.error);
