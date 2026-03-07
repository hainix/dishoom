/**
 * Replaces the 14 placeholder articles with the 9 real news articles
 * from seed-data.json (which have full content from the original MySQL dump).
 */

import Database from "better-sqlite3";
import path from "path";
import { readFileSync } from "fs";

const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

const seedData = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "prisma/seed-data.json"), "utf8")
);

const articles = seedData.articles as Array<{
  title: string;
  slug: string;
  content?: string;
  description?: string;
  thumbnail?: string;
  celebrity?: string;
  is_spotlight?: boolean;
  created_at?: string;
}>;

// Clear existing placeholder articles
db.prepare("DELETE FROM articles").run();
console.log("Cleared existing articles");

const insert = db.prepare(`
  INSERT OR REPLACE INTO articles (title, slug, description, content, thumbnail, celebrity, is_spotlight, created_at)
  VALUES (@title, @slug, @description, @content, @thumbnail, @celebrity, @is_spotlight, @created_at)
`);

const doInsert = db.transaction(() => {
  for (const a of articles) {
    // Use first ~200 chars of content as description if none
    const description = a.description ||
      (a.content ? a.content.slice(0, 200).replace(/\s+\S*$/, "...") : null);

    insert.run({
      title: a.title,
      slug: a.slug,
      description,
      content: a.content || null,
      thumbnail: a.thumbnail || null,
      celebrity: a.celebrity || null,
      is_spotlight: a.is_spotlight ? 1 : 0,
      created_at: a.created_at || new Date().toISOString(),
    });
    console.log(`  ✓ ${a.title}`);
  }
});

doInsert();
console.log(`\nDone! Imported ${articles.length} articles`);

db.close();
