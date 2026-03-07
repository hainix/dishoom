import { runArticlesCron } from "../lib/cron/articles";

runArticlesCron()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
