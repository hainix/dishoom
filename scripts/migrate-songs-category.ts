/**
 * One-time migration: adds category + tags columns to songs table
 * and keyword-matches song titles to assign categories.
 *
 * Run: npx tsx scripts/migrate-songs-category.ts
 */
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.resolve(__dirname, "../prisma/dev.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

const existingCols = (db.prepare("PRAGMA table_info(songs)").all() as { name: string }[])
  .map((c) => c.name);

if (!existingCols.includes("category")) {
  db.exec("ALTER TABLE songs ADD COLUMN category TEXT");
  console.log("Added column: category");
} else {
  console.log("Column category already exists");
}

if (!existingCols.includes("tags")) {
  db.exec("ALTER TABLE songs ADD COLUMN tags TEXT");
  console.log("Added column: tags");
} else {
  console.log("Column tags already exists");
}

const CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  { category: "qawwali",    keywords: ["qawwali", "sufi", "khwaja", "ya ali", "maula", "chaap tilak"] },
  { category: "patriotic",  keywords: ["desh", "bharat", "vande", "tiranga", "mataram", "watan"] },
  { category: "devotional", keywords: ["bhajan", "aarti", "ram", "krishna", "mata", "devi", "mandir"] },
  { category: "item",       keywords: ["sheila", "munni", "item", "cabaret", "mujra", "chamak", "laila"] },
  { category: "wedding",    keywords: ["shaadi", "vivah", "mehndi", "sangeet", "dulha", "dulhan", "baraat"] },
  { category: "rain",       keywords: ["baarish", "barsat", "saawan", "rimjhim", "boond", "barsaat"] },
  { category: "dance",      keywords: ["naach", "dance", "thumka", "bhangra", "dhol", "nachna", "nachle"] },
  { category: "sad",        keywords: ["dard", "judaai", "alvida", "tanha", "bewafa", "aansu", "gham"] },
  { category: "love",       keywords: ["pyar", "ishq", "mohabbat", "sanam", "jaanu", "chaand", "pehla nasha"] },
];

function assignCategory(title: string | null): string {
  if (!title) return "other";
  const lower = title.toLowerCase();
  for (const { category, keywords } of CATEGORY_RULES) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "other";
}

const songs = db.prepare("SELECT id, title FROM songs").all() as { id: number; title: string | null }[];
console.log("Processing " + songs.length + " songs...");

const updateStmt = db.prepare("UPDATE songs SET category = ? WHERE id = ?");
const updateAll = db.transaction(() => {
  for (const song of songs) {
    updateStmt.run(assignCategory(song.title), song.id);
  }
});
updateAll();

const stats = db
  .prepare("SELECT category, COUNT(*) as cnt FROM songs GROUP BY category ORDER BY cnt DESC")
  .all() as { category: string; cnt: number }[];

console.log("\nCategory distribution:");
for (const row of stats) {
  console.log("  " + row.category.padEnd(12) + " " + row.cnt);
}

console.log("\nMigration complete.");
db.close();
