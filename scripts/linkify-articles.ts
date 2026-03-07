/**
 * Retroactively add inline film/person links to existing articles.
 * Safe to re-run — only updates articles that don't already contain article-links.
 *
 * Run: npx tsx scripts/linkify-articles.ts
 */
import Database from "better-sqlite3";
import path from "path";
import { buildEntityMaps, linkifyHtml } from "../lib/cron/articles";

const db = new Database(path.resolve(process.cwd(), "prisma/dev.db"));

// Load entity maps (uses getDb internally — needs prisma/dev.db path)
// getDb() in lib/db.ts resolves from process.cwd(), which is the project root
const maps = buildEntityMaps();
console.log(`Entity maps: ${maps.films.length} films, ${maps.people.length} people`);

// Target: new articles from the cron (32+) plus the hand-written 2026 articles (24-31)
const arts = db.prepare(
  "SELECT id, title, content FROM articles WHERE id >= 24 ORDER BY id"
).all() as Array<{ id: number; title: string; content: string }>;

console.log(`\nProcessing ${arts.length} articles...\n`);

const update = db.prepare("UPDATE articles SET content = ? WHERE id = ?");

/** Strip any existing <a> links (unwrap to plain text) so we start clean */
function stripLinks(html: string): string {
  return html
    .replace(/<a\s[^>]*>/gi, "")
    .replace(/<\/a>/gi, "");
}

let changed = 0;
const run = db.transaction(() => {
  for (const art of arts) {
    // Strip any previously-applied (possibly broken) links before re-running
    const clean = stripLinks(art.content);
    const linked = linkifyHtml(clean, maps);
    if (linked !== clean) {
      update.run(linked, art.id);
      // Count links added
      const count = (linked.match(/href="\/film\//g) ?? []).length +
                    (linked.match(/href="\/person\//g) ?? []).length;
      console.log(`  [${art.id}] +${count} links — ${art.title.slice(0, 50)}`);
      changed++;
    } else {
      console.log(`  [${art.id}] no new matches — ${art.title.slice(0, 50)}`);
      // Still update if we stripped broken links
      if (clean !== art.content) update.run(clean, art.id);
    }
  }
});

run();
console.log(`\nDone — ${changed} articles updated`);
db.close();
