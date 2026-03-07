/**
 * Next.js instrumentation hook — runs once at server startup.
 * Schedules the daily cron job at 06:00 UTC.
 * Only active in the Node.js runtime (not Edge).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { schedule } = await import("node-cron");
    const { runDailyCron } = await import("./lib/cron/index");
    schedule("0 6 * * *", async () => {
      console.log("[cron] starting daily run", new Date().toISOString());
      try {
        await runDailyCron();
      } catch (err) {
        console.error("[cron] error:", err);
      }
    });
    console.log("[cron] daily job scheduled at 06:00 UTC");
  }
}
