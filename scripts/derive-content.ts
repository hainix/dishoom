/**
 * derive-content.ts
 *
 * Backfills `oneliner` and `summary` fields for films that have `plot` text
 * but are missing those fields. Runs as a one-time enrichment step.
 *
 * Usage: npx tsx scripts/derive-content.ts
 */

import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.resolve(process.cwd(), "prisma/dev.db"));

/**
 * Extracts the first complete sentence from text, capped at maxLen chars.
 * Falls back to a word-boundary truncation with ellipsis.
 */
function firstSentence(text: string, maxLen = 130): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^(.+?[.!?])(?:\s|$)/);
  if (match && match[1].length <= maxLen) return match[1].trim();
  if (trimmed.length <= maxLen) return trimmed;
  const cut = trimmed.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

/**
 * Builds a short summary from the first 2-3 sentences of plot, up to ~300 chars.
 */
function deriveSummary(plot: string, maxLen = 300): string {
  const sentences = plot.match(/[^.!?]+[.!?]+\s*/g) ?? [];
  let result = "";
  for (const sentence of sentences.slice(0, 3)) {
    if ((result + sentence).length > maxLen) break;
    result += sentence;
  }
  if (!result) result = plot.slice(0, maxLen);
  return result.trim();
}

// ── Derive oneliners ──────────────────────────────────────────────────────────

const noOneliner = db
  .prepare(
    `SELECT id, plot FROM films
     WHERE (plot IS NOT NULL AND plot != '')
       AND (oneliner IS NULL OR oneliner = '')`
  )
  .all() as { id: number; plot: string }[];

console.log(`\nDeriving oneliners for ${noOneliner.length} films…`);

const setOneliner = db.prepare(`UPDATE films SET oneliner = ? WHERE id = ?`);
const onelinerCount = db.transaction(() => {
  let n = 0;
  for (const film of noOneliner) {
    const derived = firstSentence(film.plot);
    if (derived) {
      setOneliner.run(derived, film.id);
      n++;
    }
  }
  return n;
})();

console.log(`  ✓ Set oneliner on ${onelinerCount} films`);

// ── Derive summaries ──────────────────────────────────────────────────────────

const noSummary = db
  .prepare(
    `SELECT id, plot FROM films
     WHERE (plot IS NOT NULL AND plot != '')
       AND (summary IS NULL OR summary = '')`
  )
  .all() as { id: number; plot: string }[];

console.log(`\nDeriving summaries for ${noSummary.length} films…`);

const setSummary = db.prepare(`UPDATE films SET summary = ? WHERE id = ?`);
const summaryCount = db.transaction(() => {
  let n = 0;
  for (const film of noSummary) {
    const derived = deriveSummary(film.plot);
    if (derived) {
      setSummary.run(derived, film.id);
      n++;
    }
  }
  return n;
})();

console.log(`  ✓ Set summary on ${summaryCount} films`);

// ── Final stats ───────────────────────────────────────────────────────────────

const stats = db
  .prepare(
    `SELECT
       COUNT(*) as total,
       COUNT(CASE WHEN oneliner IS NOT NULL AND oneliner != '' THEN 1 END) as has_oneliner,
       COUNT(CASE WHEN summary IS NOT NULL AND summary != '' THEN 1 END) as has_summary,
       COUNT(CASE WHEN plot IS NOT NULL AND plot != '' THEN 1 END) as has_plot
     FROM films`
  )
  .get() as { total: number; has_oneliner: number; has_summary: number; has_plot: number };

console.log(`\nFinal content coverage:`);
console.log(`  Total films:          ${stats.total}`);
console.log(`  Have oneliner:        ${stats.has_oneliner} (${Math.round((stats.has_oneliner / stats.total) * 100)}%)`);
console.log(`  Have summary:         ${stats.has_summary} (${Math.round((stats.has_summary / stats.total) * 100)}%)`);
console.log(`  Have plot:            ${stats.has_plot} (${Math.round((stats.has_plot / stats.total) * 100)}%)`);
console.log(`\nDone.\n`);
