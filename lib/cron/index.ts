/**
 * Daily cron orchestrator.
 * Runs articles → films → songs in sequence.
 * Each module is imported lazily so failures are isolated.
 */
import { runArticlesCron } from "./articles";
import { runFilmsCron } from "./films";
import { runSongsCron } from "./songs";

export async function runDailyCron(): Promise<void> {
  console.log("[cron:articles] starting…");
  try {
    await runArticlesCron();
    console.log("[cron:articles] done");
  } catch (err) {
    console.error("[cron:articles] failed:", err);
  }

  console.log("[cron:films] starting…");
  try {
    await runFilmsCron();
    console.log("[cron:films] done");
  } catch (err) {
    console.error("[cron:films] failed:", err);
  }

  console.log("[cron:songs] starting…");
  try {
    await runSongsCron();
    console.log("[cron:songs] done");
  } catch (err) {
    console.error("[cron:songs] failed:", err);
  }

  console.log("[cron] all jobs complete", new Date().toISOString());
}
