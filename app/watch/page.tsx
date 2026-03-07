import { getSongsByCategory, getSongCategories } from "@/lib/db";
import WatchPlayer from "@/components/WatchPlayer";
import Link from "next/link";

interface WatchPageProps {
  searchParams: Promise<{ category?: string; page?: string }>;
}

/**
 * Display labels for song tags — curated from the 155 tags in the DB.
 * Tags not listed here still work as filters but show their raw name.
 */
const CATEGORY_LABELS: Record<string, string> = {
  // ── Era ──────────────────────────────────────────────────────────────────
  "golden-age":          "🎞️ Golden Age",
  "black-and-white":     "🎬 Black & White",
  "retro-70s":           "📼 Retro 70s",

  // ── Style ─────────────────────────────────────────────────────────────────
  "qawwali":             "🕌 Qawwali",
  "ghazal":              "🪔 Ghazal",
  "mujra":               "💃 Mujra",
  "bhajan":              "🙏 Bhajan",
  "folk":                "🪘 Folk",
  "classical":           "🎻 Classical",
  "sufi":                "🌀 Sufi",
  "item-number":         "🔥 Item Number",
  "instrumental":        "🎼 Instrumental",

  // ── Mood ──────────────────────────────────────────────────────────────────
  "romantic":            "💘 Romantic",
  "soulful":             "🫀 Soulful",
  "tear-jerker":         "😭 Tear-Jerker",
  "heartbreak":          "💔 Heartbreak",
  "melancholy":          "🌧️ Melancholy",
  "bittersweet":         "🍂 Bittersweet",
  "philosophical":       "🪞 Philosophical",
  "defiant":             "✊ Defiant",
  "playful":             "😄 Playful",
  "euphoric":            "🎉 Euphoric",

  // ── Energy ────────────────────────────────────────────────────────────────
  "anthem":              "📢 Anthem",
  "earworm":             "🎧 Earworm",
  "dance-floor":         "🕺 Dance Floor",
  "singalong":           "🎤 Singalong",
  "campfire":            "🔥 Campfire",
  "slow-burn":           "🕯️ Slow Burn",
  "crowd-pleaser":       "👐 Crowd Pleaser",

  // ── Theme / Occasion ─────────────────────────────────────────────────────
  "friendship":          "🤝 Friendship",
  "friendship-anthem":   "🤜 Friendship Anthem",
  "maternal-love":       "🤱 Maternal Love",
  "monsoon":             "⛈️ Monsoon",
  "rain-romance":        "☔ Rain Romance",
  "holi":                "🎨 Holi",
  "wedding":             "💍 Wedding",
  "patriotic":           "🇮🇳 Patriotic",
  "devotional":          "🙏 Devotional",
  "village-life":        "🌾 Village Life",
  "coming-of-age":       "🎓 Coming of Age",
  "college-anthem":      "📚 College Anthem",
  "road-trip":           "🚗 Road Trip",
  "radha-krishna":       "🪷 Radha Krishna",
  "mughal-era":          "👑 Mughal Era",
  "british-india":       "🏏 British India",
  "cricket":             "🏏 Cricket",
  "goa-vibes":           "🏖️ Goa Vibes",

  // ── Composer / Artist ─────────────────────────────────────────────────────
  "ar-rahman":           "🎹 AR Rahman",
  "raj-kapoor":          "🎠 Raj Kapoor",
  "shankar-ehsaan-loy":  "🎸 Shankar-Ehsaan-Loy",
  "lata-mangeshkar":     "🎙️ Lata Mangeshkar",
  "mohit-chauhan":       "🎙️ Mohit Chauhan",

  // ── Cultural Significance ─────────────────────────────────────────────────
  "iconic":              "⭐ Iconic",
  "evergreen":           "🌿 Evergreen",
  "oscar-winning":       "🏆 Oscar-Winning",
  "bollywood-crossover": "🌍 Global Hit",
  "bombshell":           "💣 Bombshell",
  "vagabond":            "🎒 Vagabond",
  "courtly":             "🏯 Courtly",
};

export default async function WatchPage({ searchParams }: WatchPageProps) {
  const params = await searchParams;
  const category = params.category || "golden-age";
  const page = params.page ? Number(params.page) : 1;

  const categories = getSongCategories();
  const { songs, total } = getSongsByCategory(category, { page, pageSize: 24 });
  const totalPages = Math.ceil(total / 24);
  const label = CATEGORY_LABELS[category] ?? category;

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 56px)", background: "#0d0505" }}>

      {/* ── Category strip ───────────────────────────────────────────── */}
      <div className="overflow-x-auto border-b flex-shrink-0"
           style={{ background: "#1a0a00", borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex gap-1 px-4 py-3" style={{ minWidth: "max-content" }}>
          {categories.map(({ category: cat, count }) => {
            const isActive = cat === category;
            const catLabel = CATEGORY_LABELS[cat] ?? cat;
            return (
              <Link
                key={cat}
                href={`/watch?category=${encodeURIComponent(cat)}&page=1`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                style={{
                  background: isActive ? "#EF4832" : "rgba(255,255,255,0.07)",
                  color: isActive ? "white" : "rgba(255,255,255,0.55)",
                }}
              >
                {catLabel}
                <span
                  className="tabular-nums"
                  style={{ color: isActive ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.3)", fontSize: 10 }}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Player or empty state ─────────────────────────────────────── */}
      {songs.length > 0 ? (
        <div className="flex-1 overflow-hidden" style={{ maxHeight: "calc(100vh - 56px - 52px)" }}>
          <WatchPlayer
            songs={songs}
            category={category}
            categoryLabel={label}
            total={total}
            page={page}
            totalPages={totalPages}
          /></div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-6">
          <p className="text-6xl mb-5">🎵</p>
          <p className="text-lg font-semibold mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
            Songs coming soon
          </p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            We&rsquo;re adding YouTube links for our 16,000+ song database.
          </p>
        </div>
      )}
    </div>
  );
}
