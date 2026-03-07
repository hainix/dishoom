import path from "path";
import fs from "fs";
import { runArticlesCron } from "../lib/cron/articles";

// Load .env.local so ANTHROPIC_API_KEY is available
if (!process.env.ANTHROPIC_API_KEY) {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const eqIdx = line.indexOf("=");
      if (eqIdx < 1) continue;
      const k = line.slice(0, eqIdx).trim();
      const v = line.slice(eqIdx + 1).trim();
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}

runArticlesCron()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
