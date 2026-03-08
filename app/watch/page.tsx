export const dynamic = 'force-dynamic';

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Watch Bollywood Songs",
  description: "Stream classic and modern Bollywood songs — dance, love, qawwali, item numbers and more.",
};

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

const TAG_GROUPS = [
  { label: "Era",      tags: ["golden-age", "black-and-white", "retro-70s"] },
  { label: "Style",    tags: ["qawwali", "ghazal", "mujra", "bhajan", "folk", "classical", "sufi", "item-number", "instrumental"] },
  { label: "Mood",     tags: ["soulful", "romantic", "tear-jerker", "heartbreak", "melancholy", "bittersweet", "philosophical", "defiant", "playful", "euphoric"] },
  { label: "Energy",   tags: ["earworm", "anthem", "singalong", "dance-floor", "campfire", "crowd-pleaser", "slow-burn"] },
  { label: "Theme",    tags: ["devotional", "village-life", "friendship", "maternal-love", "radha-krishna", "monsoon", "rain-romance", "patriotic", "mughal-era", "holi", "wedding", "british-india", "coming-of-age", "college-anthem"] },
  { label: "Composer", tags: ["ar-rahman", "raj-kapoor", "shankar-ehsaan-loy", "lata-mangeshkar"] },
  { label: "Cultural", tags: ["iconic", "evergreen", "oscar-winning", "bollywood-crossover", "bombshell", "vagabond", "courtly"] },
];

export default async function WatchPage({ searchParams }: WatchPageProps) {
  const params = await searchParams;
  const category = params.category || "golden-age";
  const page = params.page ? Number(params.page) : 1;

  const categories = getSongCategories();
  const { songs, total } = getSongsByCategory(category, { page, pageSize: 24 });
  const totalPages = Math.ceil(total / 24);

  const countMap: Record<string, number> = Object.fromEntries(
    categories.map(({ category: cat, count }) => [cat, count])
  );

  return (
    <div
      style={{
        minHeight: "calc(100vh - 85px)",
        background: "#0d0505",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Three-column layout */}
      <div className="flex flex-1" style={{ minHeight: 0 }}>

        {/* ── Desktop sidebar ───────────────────────────────────────────── */}
        <aside
          className="hidden lg:flex flex-col flex-shrink-0 overflow-y-auto"
          style={{ width: 260, background: "#110404", borderRight: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Sidebar header */}
          <div className="px-6 pt-6 pb-3 flex-shrink-0">
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              Browse by Tag
            </p>
          </div>

          {/* Tag groups */}
          <nav className="flex-1 pb-6">
            {TAG_GROUPS.map((group) => {
              const visibleTags = group.tags.filter((tag) => (countMap[tag] ?? 0) > 0);
              if (visibleTags.length === 0) return null;
              return (
                <div key={group.label} className="mb-1">
                  <p
                    className="px-6 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "rgba(255,255,255,0.2)", fontSize: 9 }}
                  >
                    {group.label}
                  </p>
                  {visibleTags.map((tag) => {
                    const isActive = tag === category;
                    const label = CATEGORY_LABELS[tag] ?? tag;
                    const count = countMap[tag] ?? 0;
                    return (
                      <Link
                        key={tag}
                        href={`/watch?category=${encodeURIComponent(tag)}&page=1`}
                        className="flex items-center justify-between px-6 py-2 text-xs transition-colors"
                        style={{
                          borderLeft: isActive ? "3px solid #EF4832" : "3px solid transparent",
                          background: isActive ? "rgba(239,72,50,0.08)" : "transparent",
                          color: isActive ? "#FFF8EE" : "rgba(255,255,255,0.55)",
                        }}
                      >
                        <span className="truncate">{label}</span>
                        <span
                          className="ml-2 flex-shrink-0 tabular-nums"
                          style={{ color: isActive ? "#D4AF37" : "rgba(255,255,255,0.2)", fontSize: 10 }}
                        >
                          {count}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* ── Content area (player + playlist) ─────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Mobile tag strip */}
          <div
            className="block lg:hidden overflow-x-auto flex-shrink-0 border-b"
            style={{ background: "#1a0a00", borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center gap-0 px-3 py-2.5" style={{ minWidth: "max-content" }}>
              {TAG_GROUPS.map((group, gi) => {
                const visibleTags = group.tags.filter((tag) => (countMap[tag] ?? 0) > 0);
                if (visibleTags.length === 0) return null;
                return (
                  <div key={group.label} className="flex items-center">
                    {gi > 0 && (
                      <div
                        className="mx-3 flex-shrink-0"
                        style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }}
                      />
                    )}
                    <span
                      className="mr-2 uppercase font-bold flex-shrink-0"
                      style={{ color: "rgba(255,255,255,0.2)", fontSize: 9, letterSpacing: "0.08em" }}
                    >
                      {group.label}
                    </span>
                    <div className="flex gap-1">
                      {visibleTags.map((tag) => {
                        const isActive = tag === category;
                        const label = CATEGORY_LABELS[tag] ?? tag;
                        return (
                          <Link
                            key={tag}
                            href={`/watch?category=${encodeURIComponent(tag)}&page=1`}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0"
                            style={{
                              background: isActive ? "#EF4832" : "rgba(255,255,255,0.08)",
                              color: isActive ? "white" : "rgba(255,255,255,0.55)",
                            }}
                          >
                            {label}
                            <span style={{ color: isActive ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)", fontSize: 10 }}>
                              {countMap[tag] ?? 0}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Player or empty state */}
          {songs.length > 0 ? (
            <div className="flex-1 overflow-y-auto">
              <WatchPlayer
                songs={songs}
                category={category}
                page={page}
                totalPages={totalPages}
                categoryLabels={CATEGORY_LABELS}
              />
            </div>
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
      </div>
    </div>
  );
}
