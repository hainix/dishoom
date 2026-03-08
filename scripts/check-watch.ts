import Database from "better-sqlite3";
import path from "path";
const db = new Database(path.resolve(process.cwd(), "prisma/dev.db"));
const rows = db.prepare(
  `SELECT category FROM songs WHERE category IS NOT NULL AND category != '' AND youtube_id IS NOT NULL AND youtube_id != ''`
).all() as { category: string }[];
const counts: Record<string, number> = {};
for (const r of rows) {
  for (const tag of r.category.split(",").map(t => t.trim()).filter(Boolean)) {
    counts[tag] = (counts[tag] || 0) + 1;
  }
}
const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
console.log("Categories with YouTube IDs:");
sorted.slice(0, 25).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
db.close();
