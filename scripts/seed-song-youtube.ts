/**
 * Seeds YouTube IDs that were confirmed in the original Dishoom source data (dishoomreviews.sql).
 * These 5 IDs are the only ones we know for certain are correct.
 *
 * For bulk population use: scripts/fetch-youtube-ids.ts (needs YouTube Data API key)
 *
 * Run: npx tsx scripts/seed-song-youtube.ts
 */
import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.resolve(__dirname, "../prisma/dev.db"));
db.pragma("journal_mode = WAL");

// Confirmed from dishoomreviews.sql — format: (id, name, film, rating, votes, year, artists, video)
const CONFIRMED: { filmId: number; title: string; youtubeId: string; category: string }[] = [
  { filmId: 2,   title: "Golmaal",           youtubeId: "CZLSO9Qckbc", category: "dance" },
  { filmId: 92,  title: "Sheila Ki Jawaani", youtubeId: "hcKtDXUb6Cg", category: "item"  },
  { filmId: 825, title: "Maiya Yashoda",     youtubeId: "VFBGgov9Cw4", category: "devotional" },
  { filmId: 4,   title: "Pee Loon",          youtubeId: "olOK2OYI7Fo", category: "love"  },
];

const updateStmt = db.prepare(
  `UPDATE songs SET youtube_id = ?, category = ?
   WHERE film_id = ? AND lower(title) LIKE lower(?) AND (youtube_id IS NULL OR youtube_id = '')`
);
const insertStmt = db.prepare(
  `INSERT OR IGNORE INTO songs (film_id, title, youtube_id, category) VALUES (?, ?, ?, ?)`
);

let updated = 0;
let inserted = 0;

db.transaction(() => {
  for (const s of CONFIRMED) {
    const r = updateStmt.run(s.youtubeId, s.category, s.filmId, `%${s.title}%`);
    if (r.changes > 0) { updated++; }
    else { insertStmt.run(s.filmId, s.title, s.youtubeId, s.category); inserted++; }
  }
})();

console.log(`Done: ${updated} updated, ${inserted} inserted.`);
console.log("To populate the rest, run: YOUTUBE_API_KEY=<key> npx tsx scripts/fetch-youtube-ids.ts");
db.close();
