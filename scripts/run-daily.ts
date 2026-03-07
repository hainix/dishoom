/**
 * Manual trigger for the full daily cron pipeline.
 *
 * Usage:
 *   npx tsx scripts/run-daily.ts               # all three jobs
 *   npx tsx scripts/run-daily.ts --films        # films only
 *   npx tsx scripts/run-daily.ts --articles     # articles only
 *   npx tsx scripts/run-daily.ts --songs        # songs only
 */
import path from "path";
import fs from "fs";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const [k, ...rest] = line.split("=");
    if (k && rest.length) process.env[k.trim()] = rest.join("=").trim();
  }
}

const args = process.argv.slice(2);
const only = args.find((a) => ["--films", "--articles", "--songs"].includes(a));

async function main() {
  if (!only || only === "--films") {
    const { runFilmsCron } = await import("../lib/cron/films");
    console.log("▶ films");
    await runFilmsCron();
  }
  if (!only || only === "--articles") {
    const { runArticlesCron } = await import("../lib/cron/articles");
    console.log("▶ articles");
    await runArticlesCron();
  }
  if (!only || only === "--songs") {
    const { runSongsCron } = await import("../lib/cron/songs");
    console.log("▶ songs");
    await runSongsCron();
  }
  console.log("✓ done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
