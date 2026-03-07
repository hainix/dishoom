import Link from "next/link";
import type { VibeStat } from "@/lib/db";

const VIBE_ORDER = [
  "Dishoom Dishoom",
  "Cult Classic",
  "100% Masala",
  "No Brain Required Comedy",
  "Love/Romance",
  "Angry Young Man",
  "Blockbuster",
  "Movies with a Message",
  "Candy-Floss/NRI Romance",
  "Feel Good",
];

const VIBE_EMOJI: Record<string, string> = {
  "Dishoom Dishoom": "👊",
  "Cult Classic": "🎬",
  "100% Masala": "🌶️",
  "No Brain Required Comedy": "😂",
  "Love/Romance": "💘",
  "Angry Young Man": "😤",
  "Blockbuster": "🏆",
  "Movies with a Message": "✊",
  "Candy-Floss/NRI Romance": "🌸",
  "Feel Good": "🌟",
};

interface VibeGridProps {
  stats: VibeStat[];
}

export default function VibeGrid({ stats }: VibeGridProps) {
  const statMap = Object.fromEntries(stats.map((s) => [s.badge, s]));
  const vibes = VIBE_ORDER
    .map((name) => ({ name, stat: statMap[name] }))
    .filter(({ stat }) => stat && stat.count > 0)
    .slice(0, 8);

  if (vibes.length === 0) return null;

  return (
    <div className="px-4 py-8" style={{ backgroundColor: "#0d0505" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="flex items-center gap-3 mb-6">
          <hr className="gold-rule flex-1" />
          <h2
            className="text-dishoom-gold text-2xl font-bold uppercase tracking-wider whitespace-nowrap"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What Are You In The Mood For?
          </h2>
          <hr className="gold-rule flex-1" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {vibes.map(({ name, stat }) => (
            <Link
              key={name}
              href={`/films?badge=${encodeURIComponent(name)}&page=1`}
              className="relative overflow-hidden rounded group"
              style={{ minHeight: 100 }}
            >
              {/* Poster bg */}
              {stat.posterSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={stat.posterSrc}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity"
                />
              ) : (
                <div className="absolute inset-0 bg-dishoom-deep" />
              )}
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors" />
              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-center h-full p-3 text-center" style={{ minHeight: 100 }}>
                <span className="text-2xl mb-1">{VIBE_EMOJI[name] ?? "🎥"}</span>
                <p className="text-white text-xs font-bold uppercase tracking-wide leading-tight">
                  {name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{stat.count} films</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
